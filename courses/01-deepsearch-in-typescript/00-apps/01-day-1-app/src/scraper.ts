import * as cheerio from "cheerio";
import { setTimeout } from "node:timers/promises";
import robotsParser from "robots-parser";
import TurndownService from "turndown";
import { env } from "~/env";
import { cacheWithRedis } from "~/server/redis/redis";

export const DEFAULT_MAX_RETRIES = 3;
const MIN_DELAY_MS = 500; // 0.5 seconds
const MAX_DELAY_MS = 8000; // 8 seconds
const JINA_READER_URL = "https://r.jina.ai/";

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

type JinaReaderResponse = {
  code: number;
  status: number;
  data: string;
  meta?: unknown;
};

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

const getRetryDelay = (attempt: number): number => {
  const baseDelay = MIN_DELAY_MS * Math.pow(2, attempt);
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.min(baseDelay * jitter, MAX_DELAY_MS);
};

const isRetryableStatus = (status: number): boolean => {
  return status >= 500 || status === 408 || status === 425 || status === 429;
};

const extractJinaContent = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = (payload as { data?: unknown }).data;

  if (typeof data === "string") {
    return data;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const candidates = ["content", "markdown", "text", "html"] as const;

  for (const key of candidates) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
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
      result: await scrapeWebsiteWithFallback({ url, maxRetries }),
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

const scrapeWebsiteWithJina = async (
  options: ScrapeOptions & { url: string },
): Promise<ScrapeResponse> => {
  const { url, maxRetries = DEFAULT_MAX_RETRIES } = options;

  if (!env.JINA_API_KEY) {
    return {
      success: false,
      error: "JINA_API_KEY is not set",
    };
  }

  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const response = await fetch(JINA_READER_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${env.JINA_API_KEY}`,
          "Content-Type": "application/json",
          "X-Respond-With": "markdown",
          "X-Robots-Txt": "LinkedInBot",
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();
          if (text.trim().length > 0) {
            return {
              success: true,
              data: text.trim(),
            };
          }

          return {
            success: false,
            error: "Jina reader response missing data",
          };
        }

        const json = (await response.json()) as JinaReaderResponse;
        const extracted = extractJinaContent(json);

        if (!extracted) {
          return {
            success: false,
            error: "Jina reader response missing data",
          };
        }

        return {
          success: true,
          data: extracted.trim(),
        };
      }

      const status = response.status;
      const responseText = await response.text();
      const retryable = isRetryableStatus(status);

      attempts++;

      if (!retryable) {
        return {
          success: false,
          error: `Jina reader failed: ${status} ${response.statusText} ${responseText}`.trim(),
        };
      }

      if (attempts >= maxRetries) {
        return {
          success: false,
          error: `Jina reader failed after ${maxRetries} attempts: ${status} ${response.statusText}`,
        };
      }

      await setTimeout(getRetryDelay(attempts));
    } catch (error) {
      attempts++;

      if (attempts >= maxRetries) {
        return {
          success: false,
          error: `Jina reader network error after ${maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }

      await setTimeout(getRetryDelay(attempts));
    }
  }

  return {
    success: false,
    error: "Maximum retry attempts reached",
  };
};

const scrapeWebsiteWithFallback = async (
  options: ScrapeOptions & { url: string },
): Promise<ScrapeResponse> => {
  const { url, maxRetries = DEFAULT_MAX_RETRIES } = options;

  if (env.JINA_API_KEY) {
    const jinaResult = await scrapeWebsiteWithJina({ url, maxRetries });
    if (jinaResult.success) {
      return jinaResult;
    }

    console.warn("Jina reader failed, falling back to homegrown scraper.", {
      url,
      error: jinaResult.error,
    });
  }

  return scrapeWebsite({ url, maxRetries });
};

export const scrapeMultipleUrls = bulkScrapeWebsites;
