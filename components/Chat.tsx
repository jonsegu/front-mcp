"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import type { ChatMessage as ChatMessageType, ChatResponseBody } from "@/types/chat";

type ChatProps = {
  messages: ChatMessageType[];
  onMessagesChange: (messages: ChatMessageType[]) => void;
};

export function Chat({ messages, onMessagesChange }: ChatProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const emptyState = useMemo(() => messages.length === 0, [messages.length]);

  async function sendMessage(content: string): Promise<void> {
    const historySnapshot = messages;
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content
    };

    onMessagesChange([...historySnapshot, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: historySnapshot
        })
      });

      const data = (await response.json()) as { error?: string } & ChatResponseBody;

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo obtener respuesta del asistente.");
      }

      const assistantMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        toolCalls: data.toolCalls
      };

      onMessagesChange([...historySnapshot, userMessage, assistantMessage]);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : "Error inesperado.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col gap-4 bg-slate-100/60 p-4 dark:bg-slate-950/60 md:p-6">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-300 bg-slate-50 p-5 shadow-inner dark:border-slate-800 dark:bg-slate-900">
        {emptyState ? (
          <div className="flex h-full min-h-[300px] items-center justify-center">
            <p className="select-none text-3xl font-semibold tracking-wide text-slate-900 dark:text-white/85 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] md:text-4xl">
              Welcome, Master Chief.
            </p>
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}

        {loading && <LoadingIndicator />}
        {error && <ErrorMessage message={error} />}
        <div ref={listEndRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={loading} />
    </section>
  );
}
