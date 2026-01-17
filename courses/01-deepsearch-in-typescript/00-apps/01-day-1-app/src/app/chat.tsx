"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
}

export const ChatPage = ({ userName, isAuthenticated }: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onError: (err) => {
      // If we get a 401, show the sign-in modal
      if (err.message.includes("401")) {
        setShowSignInModal(true);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
          role="log"
          aria-label="Chat messages"
        >
          {!isAuthenticated ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="mb-4">Please sign in to start chatting</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-gray-400">
                <p>Start a conversation by typing a message below</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              // Extract text from UIMessage parts
              const text =
                message.parts
                  ?.filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join("") || "";

              return (
                <ChatMessage
                  key={message.id || index}
                  text={text}
                  role={message.role}
                  userName={userName}
                />
              );
            })
          )}
        </div>

        <div className="border-t border-gray-700">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isAuthenticated) {
                setShowSignInModal(true);
                return;
              }
              const formData = new FormData(e.target as HTMLFormElement);
              const input = formData.get("input") as string;
              if (input.trim()) {
                sendMessage({
                  role: "user",
                  parts: [{ type: "text", text: input }],
                });
                (e.target as HTMLFormElement).reset();
              }
            }}
            className="mx-auto max-w-[65ch] p-4"
          >
            <div className="flex gap-2">
              <input
                name="input"
                placeholder={
                  isAuthenticated
                    ? "Say something..."
                    : "Please sign in to start chatting"
                }
                autoFocus={isAuthenticated}
                aria-label="Chat input"
                disabled={isLoading || !isAuthenticated}
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !isAuthenticated}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
