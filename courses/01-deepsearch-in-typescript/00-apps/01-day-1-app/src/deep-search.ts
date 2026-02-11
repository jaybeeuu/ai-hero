import {
  stepCountIs,
  streamText,
  type ModelMessage,
  type TelemetrySettings,
} from "ai";
import { z } from "zod";
import { model } from "~/model";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { scrapeMultipleUrls } from "~/scraper";

const scrapePages = cacheWithRedis("scrapePages", async (urls: string[]) => {
  return scrapeMultipleUrls({ urls });
});

const buildSystemPrompt = (currentDateTime: string) =>
  [
    "You are a web-enabled research assistant. Always search the web before answering to ensure responses are current. ",
    "Use the searchWeb tool for every user question, even if you think you know the answer. ",
    "You also have access to a scrapePages tool that fetches full page text and converts it to markdown. ",
    "Always use scrapePages for any URLs you plan to cite so you rely on full page context, not snippets. ",
    `This is IMPORTANT! Pay attention to this: the Current date/time is ${currentDateTime}. Use exactly this date in your search when `,
    "users ask for up to date information. ",
    "Workflow:",
    "  -use searchWeb to identify sources",
    "  -select a diverse set of websites",
    "  -scrape a handful (4-6) from the results",
    "  -use the content to provide comprehensive, well-informed answers. ",
    "Cite all supporting sources inline using markdown links [title](url). If no sources are available, state that ",
    "clearly.",
  ].join("\n");

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
            { q: query, num: 10 },
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
          return scrapePages(urls);
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
