import {
  stepCountIs,
  streamText,
  type ModelMessage,
  type TelemetrySettings,
} from "ai";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { model } from "~/model";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { scrapeMultipleUrls } from "~/scraper";
import { env } from "~/env";

const scrapePages = cacheWithRedis("scrapePages", async (urls: string[]) => {
  return scrapeMultipleUrls({ urls });
});

const SYSTEM_PROMPT_PATH = path.join(
  process.cwd(),
  "src",
  "prompts",
  "deep-search.md",
);

let baseSystemPrompt: string | null = null;

const getBaseSystemPrompt = () => {
  if (!baseSystemPrompt) {
    baseSystemPrompt = readFileSync(SYSTEM_PROMPT_PATH, "utf8");
  }

  return baseSystemPrompt;
};

const buildSystemPrompt = (currentDateTime: string) =>
  getBaseSystemPrompt()
    .replace("{{CURRENT_DATETIME}}", currentDateTime)
    .replace("{{SCRAPE_RESULTS_COUNT}}", String(env.SEARCH_SCRAPE_COUNT));

export const streamFromDeepSearch = (opts: {
  messages: ModelMessage[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
  onError?: Parameters<typeof streamText>[0]["onError"];
}) => {
  const currentDateTime = new Date().toISOString();

  return streamText({
    model,
    system: buildSystemPrompt(currentDateTime),
    messages: opts.messages,
    tools: {
      searchWeb: {
        inputSchema: z.object({
          query: z.string().describe("The query to search the web for"),
        }),
        execute: async ({ query }, { abortSignal }) => {
          const results = await searchSerper(
            { q: query, num: env.SEARCH_RESULTS_COUNT },
            abortSignal,
          );

          return results.organic.map((result) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            date: result.date,
          }));
        },
      },
      scrapePages: {
        inputSchema: z.object({
          urls: z.array(z.string().url()).describe("List of URLs to scrape"),
        }),
        execute: async ({ urls }) => {
          return scrapePages(urls.slice(0, env.SEARCH_SCRAPE_COUNT));
        },
      },
    },
    stopWhen: stepCountIs(10),
    experimental_telemetry: opts.telemetry,
    onFinish: opts.onFinish,
    onError: opts.onError,
  });
};

export async function askDeepSearch(messages: ModelMessage[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {},
    telemetry: {
      isEnabled: false,
    },
  });

  // Ensure the stream completes so the final text is available.
  await result.consumeStream();

  return result.text;
}
