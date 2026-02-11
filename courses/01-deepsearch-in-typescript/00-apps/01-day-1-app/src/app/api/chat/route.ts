import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { UIMessage } from "ai";
import { after } from "next/server";
import {
  observe,
  updateActiveObservation,
  updateActiveTrace,
} from "@langfuse/tracing";
import { trace } from "@opentelemetry/api";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { requests, users } from "~/server/db/schema";
import { upsertChat } from "~/server/chat-queries";
import { eq, and, gte, sql } from "drizzle-orm";
import { langfuseSpanProcessor } from "~/instrumentation";
import { streamFromDeepSearch } from "~/deep-search";

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

  const textPart = message.parts.find(
    (part): part is { type: "text"; text: string } =>
      typeof part === "object" && "type" in part && part.type === "text",
  );
  if (textPart) {
    return textPart.text.slice(0, 50);
  }

  return "New Chat";
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

const ensureNewChat = async (opts: {
  userId: string;
  chatId: string;
  messages: UIMessage[];
  title?: string;
}) => {
  const { userId, chatId, messages, title } = opts;
  const lastMessage = messages[messages.length - 1];
  const resolvedTitle =
    title && title.trim().length > 0
      ? title
      : lastMessage
        ? extractTitleFromMessage(lastMessage)
        : "New Chat";

  await upsertChat({
    userId,
    chatId,
    title: resolvedTitle,
    messages,
  });
};

const saveCompletedChat = async (opts: {
  userId: string;
  chatId: string;
  messages: UIMessage[];
  title?: string;
}): Promise<void> => {
  const { userId, chatId, messages, title } = opts;
  await upsertChat({
    userId,
    chatId,
    title,
    messages,
  });
};

type NewChatCreatedData = {
  type: "NEW_CHAT_CREATED";
  chatId: string;
};

const createDataStreamResponse = (opts: {
  headers: Record<string, string>;
  originalMessages: UIMessage[];
  onFinish: (event: { messages: UIMessage[] }) => Promise<void> | void;
  execute: (dataStream: {
    writeData: (data: NewChatCreatedData) => void;
    merge: (stream: ReadableStream) => void;
  }) => Promise<void> | void;
}) => {
  const { headers, originalMessages, onFinish, execute } = opts;
  const stream = createUIMessageStream({
    originalMessages,
    onFinish,
    execute: async ({ writer }) => {
      await execute({
        writeData: (data) => {
          writer.write({
            type: "data-new-chat-created",
            data,
            transient: true,
          });
        },
        merge: (streamToMerge) => {
          writer.merge(streamToMerge as ReadableStream);
        },
      });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers,
  });
};

const handler = async (request: Request) => {
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
  const {
    messages,
    chatId,
    title,
    isNewChat,
  }: {
    messages: UIMessage[];
    chatId: string;
    title?: string;
    isNewChat?: boolean;
  } = body;

  if (isNewChat) {
    await ensureNewChat({
      userId,
      chatId,
      messages,
      title,
    });
  }
  const currentChatId = chatId;
  const rateLimitHeaders = getRateLimitHeaders(rateLimit, currentCount);

  updateActiveTrace({
    name: "chat",
    sessionId: currentChatId,
    userId: session.user.id,
  });

  const modelMessages = await convertToModelMessages(messages);
  const result = streamFromDeepSearch({
    messages: modelMessages,
    telemetry: {
      isEnabled: true,
      functionId: "agent",
    },
    onFinish: async (result) => {
      updateActiveObservation({
        output: result.text,
      });
      updateActiveTrace({
        output: result.text,
      });
      trace.getActiveSpan()?.end();
    },
    onError: async (error) => {
      updateActiveObservation({
        output: String(error),
        level: "ERROR",
      });
      updateActiveTrace({
        output: String(error),
      });
      trace.getActiveSpan()?.end();
    },
  });

  after(async () => {
    await langfuseSpanProcessor.forceFlush();
  });

  return createDataStreamResponse({
    headers: rateLimitHeaders,
    originalMessages: messages,
    onFinish: async (event) => {
      await saveCompletedChat({
        userId,
        chatId: currentChatId,
        messages: event.messages,
        title,
      });
    },
    execute: async (dataStream) => {
      if (isNewChat) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: currentChatId,
        });
      }
      dataStream.merge(
        result.toUIMessageStream({
          originalMessages: messages,
        }) as ReadableStream,
      );
    },
  });
};

export const POST = observe(handler, {
  name: "handle-chat-message",
  endOnExit: false,
});
