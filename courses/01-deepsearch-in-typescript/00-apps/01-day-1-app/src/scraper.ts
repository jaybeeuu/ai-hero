import * as cheerio from "cheerio";
import { setTimeout } from "node:timers/promises";
import robotsParser from "robots-parser";
import TurndownService from "turndown";
import { cacheWithRedis } from "~/server/redis/redis";

export const DEFAULT_MAX_RETRIES = 3;
const MIN_DELAY_MS = 500; // 0.5 seconds
const MAX_DELAY_MS = 8000; // 8 seconds

export interface ScrapeSuccessResponse {
  success: true;
  data: string;
}

export interface ScrapeErrorResponse {
  success: false;
  error: string;
}

export type ScrapeResponse = ScrapeSuccessResponse | ScrapeErrorResponse;

export interface BulkScrapeSuccessResponse {
  success: true;
  results: {
    url: string;
    result: ScrapeSuccessResponse;
  }[];
}

export interface BulkScrapeFailureResponse {
  success: false;
  results: {
    url: string;
    result: ScrapeResponse;
  }[];
  error: string;
}

export type BulkScrapeResponse =
  | BulkScrapeSuccessResponse
  | BulkScrapeFailureResponse;

export interface ScrapeOptions {
  maxRetries?: number;
}

export interface BulkScrapeOptions extends ScrapeOptions {
  urls: string[];
}

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

const extractArticleText = (html: string): string => {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, iframe, noscript").remove();

  const articleSelectors = [
    "article",
    '[role="main"]',
    ".post-content",
    ".article-content",
    "main",
    ".content",
  ];

  let content = "";

  for (const selector of articleSelectors) {
    const element = $(selector);
    if (element.length) {
      content = turndownService.turndown(element.html() || "");
      break;
    }
  }

  if (!content) {
    content = turndownService.turndown($("body").html() || "");
  }

  return content.trim();
};

const checkRobotsTxt = async (url: string): Promise<boolean> => {
  try {
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
    const response = await fetch(robotsUrl);

    if (!response.ok) {
      return true;
    }

    const robotsTxt = await response.text();
    const robots = robotsParser(robotsUrl, robotsTxt);

    return robots.isAllowed(url, "LinkedInBot") ?? true;
  } catch {
    return true;
  }
};

export const bulkScrapeWebsites = async (
  options: BulkScrapeOptions,
): Promise<BulkScrapeResponse> => {
  const { urls, maxRetries = DEFAULT_MAX_RETRIES } = options;

  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      result: await scrapeWebsite({ url, maxRetries }),
    })),
  );

  const allSuccessful = results.every((r) => r.result.success);

  if (!allSuccessful) {
    const errors = results
      .filter((r) => !r.result.success)
      .map((r) => `${r.url}: ${(r.result as ScrapeErrorResponse).error}`)
      .join("\n");

    return {
      results,
      success: false,
      error: `Failed to scrape some websites:\n${errors}`,
    };
  }

  return {
    results,
    success: true,
  } as BulkScrapeResponse;
};

export const scrapeMultipleUrls = bulkScrapeWebsites;

export const scrapeWebsite = cacheWithRedis(
  "scrapeWebsite",
  async (options: ScrapeOptions & { url: string }): Promise<ScrapeResponse> => {
    const { url, maxRetries = DEFAULT_MAX_RETRIES } = options;

    const isAllowed = await checkRobotsTxt(url);
    if (!isAllowed) {
      return {
        success: false,
        error: `Scraping not allowed by robots.txt for: ${url}`,
      };
    }

    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const response = await fetch(url);

        if (response.ok) {
          const html = await response.text();
          const articleText = extractArticleText(html);
          return {
            success: true,
            data: articleText,
          };
        }

        attempts++;
        if (attempts === maxRetries) {
          return {
            success: false,
            error: `Failed to fetch website after ${maxRetries} attempts: ${response.status} ${response.statusText}`,
          };
        }

        const delay = Math.min(
          MIN_DELAY_MS * Math.pow(2, attempts),
          MAX_DELAY_MS,
        );
        await setTimeout(delay);
      } catch (error) {
        attempts++;
        if (attempts === maxRetries) {
          return {
            success: false,
            error: `Network error after ${maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
        const delay = Math.min(
          MIN_DELAY_MS * Math.pow(2, attempts),
          MAX_DELAY_MS,
        );
        await setTimeout(delay);
      }
    }

    return {
      success: false,
      error: "Maximum retry attempts reached",
    };
  },
);
