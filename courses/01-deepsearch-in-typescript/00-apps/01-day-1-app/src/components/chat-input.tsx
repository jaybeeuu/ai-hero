"use client";

import { Loader2 } from "lucide-react";
import { forwardRef, useCallback, useRef } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";

interface ChatInputProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  onSend: (input: string) => void;
  onRequireSignIn: () => void;
}

export const ChatInput = forwardRef<HTMLDivElement, ChatInputProps>(
  ({ isAuthenticated, isLoading, onSend, onRequireSignIn }, ref) => {
    const isDisabled = isLoading || !isAuthenticated;
    const inputRef = useRef<HTMLDivElement>(null);
    const { isAtBottom, scrollToBottom } = useStickToBottomContext();

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        (inputRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    return (
      <div className="flex-none border-t border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isAuthenticated) {
              onRequireSignIn();
              return;
            }
            const input = inputRef.current?.textContent ?? "";
            if (input.trim()) {
              onSend(input);
              if (inputRef.current) {
                inputRef.current.textContent = "";
              }
            }
          }}
          className="p-4"
        >
          <div className="flex items-end gap-2">
            <div
              ref={setRef}
              data-placeholder={
                isAuthenticated
                  ? "Say something..."
                  : "Please sign in to start chatting"
              }
              role="textbox"
              aria-label="Chat input"
              aria-multiline="true"
              aria-disabled={isDisabled}
              contentEditable={!isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              suppressContentEditableWarning
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.closest("form")?.requestSubmit();
                }
              }}
              onInput={() => {
                if (isAtBottom) {
                  requestAnimationFrame(() => scrollToBottom());
                }
              }}
              className={`chat-input flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isDisabled ? "cursor-not-allowed opacity-50" : ""
              }`}
              style={{
                maxHeight: "200px",
                minHeight: "2.5rem",
                overflowY: "auto",
              }}
            />
            <button
              type="submit"
              disabled={isDisabled}
              className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Send"}
            </button>
          </div>
        </form>
      </div>
    );
  },
);

ChatInput.displayName = "ChatInput";
