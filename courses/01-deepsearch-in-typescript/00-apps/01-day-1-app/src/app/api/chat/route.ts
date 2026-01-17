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
    system:
      "You are a helpful research assistant. Search for current information and cite your sources.",
    messages: modelMessages,
    providerOptions: {
      openai: {
        useSearchGrounding: true,
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
  });
}
