import { streamText, convertToModelMessages } from "ai";
import { model } from "~/model";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const { messages } = body;

  // Convert UIMessages to ModelMessages
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}