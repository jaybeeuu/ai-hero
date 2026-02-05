"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { isNewChatCreated } from "~/utils/chat";
import { StickToBottom } from "use-stick-to-bottom";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId?: string;
  isNewChat: boolean;
  initialMessages: UIMessage[];
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  isNewChat,
  initialMessages,
}: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [data, setData] = useState<
    Array<{ type: "NEW_CHAT_CREATED"; chatId: string }>
  >([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        chatId,
        isNewChat,
      },
    }),
    messages: initialMessages,
    onData: (dataPart) => {
      const dataItem = dataPart.data;
      if (isNewChatCreated(dataItem)) {
        setData((prev) => [...prev, dataItem]);
      }
    },
    onError: (err) => {
      // If we get a 401, show the sign-in modal
      if (err.message.includes("401")) {
        setShowSignInModal(true);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => console.log(messages), [messages]);

  useEffect(() => {
    const lastDataItem = data[data.length - 1];
    if (lastDataItem && isNewChat) {
      router.push(`?id=${lastDataItem.chatId}`);
    }
  }, [data, isNewChat, router]);

  // Restore focus to input after sending
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <StickToBottom
          className="mx-auto flex h-full min-h-0 w-full max-w-[65ch] flex-1 flex-col"
          resize="smooth"
          initial="smooth"
        >
          <StickToBottom.Content
            className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
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
                return (
                  <ChatMessage
                    key={message.id || index}
                    parts={message.parts ?? []}
                    role={message.role}
                    userName={userName}
                  />
                );
              })
            )}
          </StickToBottom.Content>
        </StickToBottom>
        <div className="flex-none border-t border-gray-700">
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
            className="p-4"
          >
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                name="input"
                placeholder={
                  isAuthenticated
                    ? "Say something..."
                    : "Please sign in to start chatting"
                }
                autoFocus={isAuthenticated}
                aria-label="Chat input"
                disabled={isLoading || !isAuthenticated}
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  const newHeight = Math.min(target.scrollHeight, 200);
                  target.style.height = `${newHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).form?.requestSubmit();
                  }
                }}
                className="flex-1 resize-none rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                style={{ overflow: "hidden", maxHeight: "200px" }}
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
