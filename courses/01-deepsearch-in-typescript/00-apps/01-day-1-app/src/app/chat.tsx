"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChatInput } from "~/components/chat-input";
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
        <ChatInput
          ref={inputRef}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          onRequireSignIn={() => setShowSignInModal(true)}
          onSend={(input) =>
            sendMessage({
              role: "user",
              parts: [{ type: "text", text: input }],
            })
          }
        />
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
