import { stepCountIs, streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth";
import { model } from "~/model";
import { db } from "~/server/db";
import { requests, users } from "~/server/db/schema";
import { upsertChat } from "~/server/chat-queries";
import { eq, and, gte, sql } from "drizzle-orm";

export const maxDuration = 60;

const REQUESTS_PER_DAY = 10;
const ADMIN_REQUESTS_PER_DAY = Infinity;

const checkHasUserExceededRate = async (userId: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const rateLimit = user?.isAdmin ? ADMIN_REQUESTS_PER_DAY : REQUESTS_PER_DAY;

  if (user?.isAdmin) {
    return { exceeded: false, count: 0, rateLimit };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const requestCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(requests)
    .where(and(eq(requests.userId, userId), gte(requests.timestamp, today)));

  const count = requestCount[0]?.count ?? 0;
  return { exceeded: count >= rateLimit, count, rateLimit };
};

const extractTitleFromMessage = (message: UIMessage): string => {
  if (!message?.parts || message.parts.length === 0) {
    return "New Chat";
  }

  const firstPart = message.parts[0];
  if (firstPart && typeof firstPart === "object" && "text" in firstPart) {
    return (firstPart as { text: string }).text.slice(0, 50);
  }

  return "New Chat";
};

const extractContentText = (
  content: string | (Record<string, unknown> & { text?: string })[],
): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => "text" in part)
      .map((part) => ("text" in part ? String(part.text) : ""))
      .join("");
  }

  return "";
};

const getRateLimitResponse = (
  rateLimit: number,
  currentCount: number,
): Response => {
  const headers = getRateLimitHeaders(rateLimit, currentCount);
  return new Response(
    JSON.stringify({
      error:
        "Rate limit exceeded. You have reached the maximum number of requests for today.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    },
  );
};

const getRateLimitHeaders = (
  rateLimit: number,
  currentCount: number,
): Record<string, string> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resetTime = new Date(today);
  resetTime.setDate(resetTime.getDate() + 1);

  return {
    "X-RateLimit-Limit": String(rateLimit),
    "X-RateLimit-Remaining": String(Math.max(0, rateLimit - currentCount)),
    "X-RateLimit-Reset": String(Math.floor(resetTime.getTime() / 1000)),
  };
};

const getOrCreateChat = async (
  userId: string,
  messages: UIMessage[],
  chatId?: string,
): Promise<string> => {
  if (chatId) {
    return chatId;
  }

  const newChatId = crypto.randomUUID();
  const lastMessage = messages[messages.length - 1];
  const title = lastMessage ? extractTitleFromMessage(lastMessage) : "New Chat";

  await upsertChat({
    userId,
    chatId: newChatId,
    title,
    messages,
  });

  return newChatId;
};

const saveCompletedChat = async (
  userId: string,
  chatId: string,
  messages: UIMessage[],
  responseMessages: unknown[],
): Promise<void> => {
  const assistantMessage = (
    responseMessages as { role?: string; content?: unknown }[]
  ).find((msg) => msg.role === "assistant");

  if (!assistantMessage) {
    return;
  }

  const contentText = extractContentText(
    assistantMessage.content as
      | string
      | (Record<string, unknown> & { text?: string })[],
  );

  if (!contentText) {
    return;
  }

  const updatedMessages: UIMessage[] = [
    ...messages,
    {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [{ type: "text" as const, text: contentText }],
    },
  ];

  const title = contentText.slice(0, 50);
  await upsertChat({
    userId,
    chatId,
    title,
    messages: updatedMessages,
  });
};

const addRateLimitHeaders = (
  response: Response,
  headers: Record<string, string>,
): Response => {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const {
    exceeded: rateExceeded,
    count: currentCount,
    rateLimit,
  } = await checkHasUserExceededRate(userId);

  if (rateExceeded) {
    return getRateLimitResponse(rateLimit, currentCount);
  }

  await db.insert(requests).values({ userId });

  const body = await request.json();
  const { messages, chatId }: { messages: UIMessage[]; chatId?: string } = body;

  const currentChatId = await getOrCreateChat(userId, messages, chatId);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit, currentCount);

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
    onFinish: async (event) => {
      if (event.response?.messages) {
        await saveCompletedChat(
          userId,
          currentChatId,
          messages,
          event.response.messages,
        );
      }
    },
  });

  const response = result.toUIMessageStreamResponse();
  return addRateLimitHeaders(response, rateLimitHeaders);
}
