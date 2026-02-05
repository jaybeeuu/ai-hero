"use client";

import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

interface ChatInputProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  onSend: (input: string) => void;
  onRequireSignIn: () => void;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ isAuthenticated, isLoading, onSend, onRequireSignIn }, ref) => {
    return (
      <div className="flex-none border-t border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isAuthenticated) {
              onRequireSignIn();
              return;
            }
            const formData = new FormData(e.target as HTMLFormElement);
            const input = formData.get("input") as string;
            if (input.trim()) {
              onSend(input);
              (e.target as HTMLFormElement).reset();
            }
          }}
          className="p-4"
        >
          <div className="flex gap-2">
            <textarea
              ref={ref}
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
    );
  },
);

ChatInput.displayName = "ChatInput";
