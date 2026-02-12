import { useState } from "react";
import type { ReactNode } from "react";

export const extractText = (value: ReactNode): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((child) => extractText(child)).join("");
  }

  if (value && typeof value === "object" && "props" in value) {
    return extractText(
      (value as { props?: { children?: ReactNode } }).props?.children,
    );
  }

  return "";
};

export const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute bottom-2 right-2 rounded bg-gray-800/80 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
};
