import { streamText, convertToModelMessages } from "ai";
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
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}