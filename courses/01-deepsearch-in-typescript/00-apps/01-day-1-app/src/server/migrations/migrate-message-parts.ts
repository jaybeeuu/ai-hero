import { lt, eq } from "drizzle-orm";
import { db } from "../db";
import { messages } from "../db/schema";
import {
  CURRENT_SCHEMA_VERSION,
  convertMessageParts,
  parseMessageParts,
} from "../schemas/message-parts";

export interface MigrationStats {
  totalMessages: number;
  migratedMessages: number;
  failedMessages: number;
  skippedMessages: number;
}

export async function migrateMessageParts(options?: {
  dryRun?: boolean;
  batchSize?: number;
}): Promise<MigrationStats> {
  const { dryRun = false, batchSize = 100 } = options ?? {};

  const stats: MigrationStats = {
    totalMessages: 0,
    migratedMessages: 0,
    failedMessages: 0,
    skippedMessages: 0,
  };

  try {
    const oldMessages = await db.query.messages.findMany({
      where: lt(messages.schemaVersion, CURRENT_SCHEMA_VERSION),
    });

    stats.totalMessages = oldMessages.length;

    if (stats.totalMessages === 0) {
      console.log("No messages need migration");
      return stats;
    }

    console.log(
      `Found ${stats.totalMessages} messages to migrate from older schema versions`,
    );

    if (dryRun) {
      console.log("Dry run mode - no changes will be made");
      return stats;
    }

    for (let i = 0; i < oldMessages.length; i += batchSize) {
      const batch = oldMessages.slice(i, i + batchSize);

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(oldMessages.length / batchSize)}`,
      );

      for (const message of batch) {
        try {
          const convertedParts = convertMessageParts(
            message.parts,
            message.schemaVersion,
            CURRENT_SCHEMA_VERSION,
          );

          const validatedParts = parseMessageParts(
            convertedParts,
            CURRENT_SCHEMA_VERSION,
          );

          await db
            .update(messages)
            .set({
              parts: validatedParts,
              schemaVersion: CURRENT_SCHEMA_VERSION,
            })
            .where(eq(messages.id, message.id));

          stats.migratedMessages++;
        } catch (error) {
          console.error(
            `Failed to migrate message ${message.id} from version ${message.schemaVersion}:`,
            error,
          );
          stats.failedMessages++;
        }
      }
    }

    console.log("Migration complete:", {
      total: stats.totalMessages,
      migrated: stats.migratedMessages,
      failed: stats.failedMessages,
    });

    return stats;
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

export async function countMessagesNeedingMigration(): Promise<number> {
  const oldMessages = await db.query.messages.findMany({
    where: lt(messages.schemaVersion, CURRENT_SCHEMA_VERSION),
  });

  return oldMessages.length;
}
