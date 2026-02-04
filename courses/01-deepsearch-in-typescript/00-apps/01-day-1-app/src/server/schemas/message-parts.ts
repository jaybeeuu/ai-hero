import { z } from "zod";

export const CURRENT_SCHEMA_VERSION = 1;

const basePartSchema = z.object({
  providerMetadata: z.record(z.unknown()).optional(),
});

const textPartSchema = basePartSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
});

const reasoningPartSchema = basePartSchema.extend({
  type: z.literal("reasoning"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
});

const toolStateSchema = z.enum([
  "input-streaming",
  "input-available",
  "output-streaming",
  "done",
  "error",
  "user-approval-requested",
  "approval-requested",
  "approval-responded",
  "output-available",
  "output-error",
  "output-denied",
]);

const toolInvocationPartSchema = basePartSchema.extend({
  type: z.literal("tool-invocation"),
  toolCallId: z.string(),
  state: toolStateSchema,
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  providerExecuted: z.boolean().optional(),
  errorText: z.string().optional(),
});

const sourceUrlPartSchema = basePartSchema.extend({
  type: z.literal("source-url"),
  sourceId: z.string(),
  url: z.string(),
  title: z.string().optional(),
});

const sourceDocumentPartSchema = basePartSchema.extend({
  type: z.literal("source-document"),
  sourceId: z.string(),
  mediaType: z.string(),
  title: z.string(),
  filename: z.string().optional(),
});

const filePartSchema = basePartSchema.extend({
  type: z.literal("file"),
  mediaType: z.string(),
  filename: z.string().optional(),
  url: z.string(),
});

const stepStartPartSchema = z.object({
  type: z.literal("step-start"),
});

const imagePartSchema = basePartSchema.extend({
  type: z.literal("image"),
  image: z.string(), // URL or data URI
  mediaType: z.string().optional(),
});

const dataPartSchema = z
  .object({
    type: z.string().regex(/^data-/),
    id: z.string().optional(),
    data: z.unknown(),
  })
  .passthrough();

const typedToolPartSchema = z
  .object({
    type: z.string().regex(/^tool-/),
    toolCallId: z.string(),
    state: toolStateSchema,
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    providerExecuted: z.boolean().optional(),
    errorText: z.string().optional(),
  })
  .passthrough();

const dynamicToolPartSchema = z
  .object({
    type: z.literal("dynamic-tool"),
    toolName: z.string(),
    toolCallId: z.string(),
    state: toolStateSchema,
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    providerExecuted: z.boolean().optional(),
    errorText: z.string().optional(),
  })
  .passthrough();

export const messagePartsV1 = z.array(
  z
    .discriminatedUnion("type", [
      textPartSchema,
      reasoningPartSchema,
      toolInvocationPartSchema,
      sourceUrlPartSchema,
      sourceDocumentPartSchema,
      filePartSchema,
      stepStartPartSchema,
      imagePartSchema,
      dynamicToolPartSchema,
    ])
    .or(dataPartSchema)
    .or(typedToolPartSchema),
);

export type MessagePartsV1 = z.infer<typeof messagePartsV1>;

export function getSchemaForVersion(version: number): z.ZodSchema {
  switch (version) {
    case 1:
      return messagePartsV1;
    default:
      throw new Error(`Unknown schema version: ${version}`);
  }
}

export function convertMessageParts(
  parts: unknown,
  fromVersion: number,
  toVersion: number = CURRENT_SCHEMA_VERSION,
): unknown {
  if (fromVersion === toVersion) {
    return parts;
  }

  console.warn(
    `No conversion available from version ${fromVersion} to ${toVersion}, returning original parts`,
  );
  return parts;
}

export function parseMessageParts(
  parts: unknown,
  version: number = CURRENT_SCHEMA_VERSION,
): unknown {
  try {
    const schema = getSchemaForVersion(version);
    return schema.parse(parts);
  } catch (error) {
    console.warn(
      `Failed to validate message parts for version ${version}:`,
      error,
    );
    return parts;
  }
}
