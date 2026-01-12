import { useState } from "react";

export type Message = { id: string; role: string; text: string };

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (input: string) => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Math.random().toString(36),
      role: "user",
      text: input
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            parts: [{ type: "text", text: m.text }]
          }))
        })
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const assistantMessage: Message = {
        id: Math.random().toString(36),
        role: "assistant",
        text: ""
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantText += chunk;

        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, text: assistantText }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, sendMessage, isLoading };
}