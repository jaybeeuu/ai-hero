import { stepCountIs, streamText, convertToModelMessages } from "ai";
import { z } from "zod";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth";
import { model } from "~/model";
import { db } from "~/server/db";
import { requests, users } from "~/server/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export const maxDuration = 60;

const REQUESTS_PER_DAY = 10;

const checkHasUserExceededRate = async (userId: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.isAdmin) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const requestCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(requests)
    .where(and(eq(requests.userId, userId), gte(requests.timestamp, today)));

  const count = requestCount[0]?.count ?? 0;
  return count >= REQUESTS_PER_DAY;
};

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const rateExceeded = await checkHasUserExceededRate(userId);
  if (rateExceeded) {
    return new Response(
      JSON.stringify({
        error:
          "Rate limit exceeded. You have reached the maximum number of requests for today.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // Record the request
  await db.insert(requests).values({
    userId,
  });

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
