import { stepCountIs, streamText, convertToModelMessages } from "ai";
import { z } from "zod";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth";
import { model } from "~/model";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { messages } = body;

  // Convert UIMessages to ModelMessages
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    system:
      "You are a web-enabled research assistant. Always search the web before answering to ensure responses are current. " +
      "Use the searchWeb tool for every user question, even if you think you know the answer. " +
      "Cite all supporting sources inline using markdown links [title](url). If no sources are available, state that clearly.",
    messages: modelMessages,
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
          }));
        },
      },
    },
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
