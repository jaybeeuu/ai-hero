import type { UIMessage } from "ai";
import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

export type MessagePart = NonNullable<UIMessage["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

const Source = ({ part }: { part: MessagePart }) => {
  if (part.type !== "source-url") return null;

  const source = (part as any).source;
  if (source.sourceType !== "url") return null;

  return (
    <div className="mb-2 rounded border border-gray-600 bg-gray-700 p-3 text-sm hover:border-gray-500">
      <div className="mb-1 font-semibold text-gray-300">📚 Source</div>
      <div className="mb-1 text-xs text-gray-400">
        {source.title || "Untitled"}
      </div>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-xs text-blue-400 hover:underline"
      >
        {source.url}
      </a>
    </div>
  );
};

const ToolInvocation = ({ part }: { part: MessagePart }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!part.type.startsWith("tool-")) return null;

  const toolName = part.type.replace("tool-", "");

  return (
    <>
      <div
        className="hover:bg-gray-650 mb-2 cursor-pointer rounded border border-gray-600 bg-gray-700 p-3 text-sm hover:border-gray-500"
        onClick={() => setIsOpen(true)}
      >
        <div className="mb-1 font-semibold text-gray-300">🔧 {toolName}</div>
        {"state" in part && part.state === "done" && "output" in part && (
          <>
            {"input" in part &&
              typeof part.input === "object" &&
              part.input &&
              "query" in part.input && (
                <div className="mb-2 text-xs text-gray-400">
                  Query: {String((part.input as any).query)}
                </div>
              )}
            {Array.isArray(part.output) && (
              <div className="text-xs text-gray-500">
                Found {part.output.length} results
              </div>
            )}
          </>
        )}
        {"state" in part &&
          part.state === "streaming" &&
          "input" in part &&
          typeof part.input === "object" &&
          part.input &&
          "query" in part.input && (
            <div className="text-xs text-gray-400">
              Searching for: {String((part.input as any).query)}
            </div>
          )}
        <div className="mt-1 text-xs text-gray-500">Click to view details</div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-gray-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-200">
                Tool Call Details: {toolName}
              </h2>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="space-y-4">
                {"state" in part && (
                  <div>
                    <h3 className="mb-2 font-semibold text-gray-300">State</h3>
                    <div className="rounded bg-gray-800 p-3 font-mono text-sm text-gray-400">
                      {part.state}
                    </div>
                  </div>
                )}

                {"input" in part && part.input ? (
                  <div>
                    <h3 className="mb-2 font-semibold text-gray-300">Input</h3>
                    <pre className="overflow-x-auto rounded bg-gray-800 p-3 font-mono text-sm text-gray-400">
                      {JSON.stringify(part.input as any, null, 2) ?? ""}
                    </pre>
                  </div>
                ) : null}

                {"output" in part && part.output ? (
                  <div>
                    <h3 className="mb-2 font-semibold text-gray-300">
                      Output{" "}
                      {Array.isArray(part.output) &&
                        `(${part.output.length} results)`}
                    </h3>
                    <pre className="overflow-x-auto rounded bg-gray-800 p-3 font-mono text-sm text-gray-400">
                      {JSON.stringify(part.output as any, null, 2) ?? ""}
                    </pre>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="border-t border-gray-700 p-4">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        <div className="prose prose-invert max-w-none">
          {parts.map((part, index) => {
            if (part.type === "text") {
              return <Markdown key={index}>{part.text}</Markdown>;
            }
            if (part.type === "source-url") {
              return <Source key={index} part={part} />;
            }
            if (part.type.startsWith("tool-")) {
              return <ToolInvocation key={index} part={part} />;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
