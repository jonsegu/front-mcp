import { useState } from "react";

type ChatInputProps = {
  onSend: (message: string) => Promise<void>;
  disabled: boolean;
};

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }
    setValue("");
    await onSend(trimmed);
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white/95 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={async (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            await handleSend();
          }
        }}
        placeholder="Escribe una pregunta..."
        rows={2}
        disabled={disabled}
        className="max-h-40 min-h-10 flex-1 resize-y rounded-lg border-0 bg-transparent px-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <button
        type="button"
        disabled={disabled || value.trim().length === 0}
        onClick={handleSend}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:bg-slate-600 dark:disabled:text-slate-200"
      >
        Send
      </button>
    </div>
  );
}
