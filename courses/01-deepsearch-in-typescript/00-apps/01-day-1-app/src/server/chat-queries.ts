import { eq, desc, asc, and } from "drizzle-orm";
import type { UIMessage } from "ai";
import { db } from "./db";
import { chats, messages } from "./db/schema";
import {
  CURRENT_SCHEMA_VERSION,
  parseMessageParts,
  convertMessageParts,
} from "./schemas/message-parts";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: UIMessage[];
}) => {
  const { userId, chatId, title, messages: newMessages } = opts;

  try {
    const existingChat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (existingChat && existingChat.userId !== userId) {
      throw new Error("Chat not found");
    }

    if (existingChat) {
      await db.delete(messages).where(eq(messages.chatId, chatId));

      await db
        .update(chats)
        .set({
          title,
          updatedAt: new Date(),
        })
        .where(eq(chats.id, chatId));
    } else {
      await db.insert(chats).values({
        id: chatId,
        userId,
        title,
      });
    }

    if (newMessages.length > 0) {
      const messagesToInsert = newMessages.map((msg, index) => {
        const validatedParts = parseMessageParts(
          msg.parts ?? [],
          CURRENT_SCHEMA_VERSION,
        );

        return {
          id: crypto.randomUUID(),
          chatId,
          role: msg.role,
          parts: validatedParts,
          order: index,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        };
      });

      await db.insert(messages).values(messagesToInsert);
    }

    return { success: true, chatId };
  } catch (error) {
    console.error("Error upserting chat:", error);
    throw error;
  }
};

export const getChat = async (opts: {
  userId: string;
  chatId: string;
}): Promise<{
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: string;
    chatId: string;
    role: string;
    parts: unknown;
    order: number;
    schemaVersion: number;
    createdAt: Date;
  }[];
} | null> => {
  const { userId, chatId } = opts;

  try {
    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
      with: {
        messages: {
          orderBy: asc(messages.order),
        },
      },
    });

    if (!chat) {
      return null;
    }

    const convertedMessages = chat.messages.map((msg) => {
      if (msg.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        const convertedParts = convertMessageParts(
          msg.parts,
          msg.schemaVersion,
          CURRENT_SCHEMA_VERSION,
        );
        const validatedParts = parseMessageParts(
          convertedParts,
          CURRENT_SCHEMA_VERSION,
        );
        return {
          ...msg,
          parts: validatedParts,
        };
      }
      return msg;
    });

    return {
      ...chat,
      messages: convertedMessages,
    };
  } catch (error) {
    console.error("Error getting chat:", error);
    throw error;
  }
};

export const getChats = async (opts: {
  userId: string;
}): Promise<
  {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  }[]
> => {
  const { userId } = opts;

  try {
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, userId),
      orderBy: desc(chats.updatedAt),
    });

    return userChats;
  } catch (error) {
    console.error("Error getting chats:", error);
    throw error;
  }
};
