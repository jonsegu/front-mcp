"use client";

import { useMemo, useState } from "react";
import { ProjectList } from "@/components/ProjectList";
import type { ChatMessage } from "@/types/chat";

type SavedChat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

type SidebarProps = {
  projects: string[];
  loading: boolean;
  error: string | null;
  onNewChat: () => void;
  savedChats: SavedChat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
};

export function Sidebar({
  projects,
  loading,
  error,
  onNewChat,
  savedChats,
  activeChatId,
  onSelectChat,
  onDeleteChat
}: SidebarProps) {
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  const sortedChats = useMemo(
    () => [...savedChats].sort((a, b) => b.updatedAt - a.updatedAt),
    [savedChats]
  );

  return (
    <aside className="w-full border-b border-slate-300 bg-slate-100 p-4 md:w-72 md:border-b-0 md:border-r dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Workspace</h2>
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          New chat
        </button>
      </div>

      <div className="mb-5">
        <button
          type="button"
          onClick={() => setIsProjectsOpen((value) => !value)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <span>Projects</span>
          <span className="text-xs">{isProjectsOpen ? "▲" : "▼"}</span>
        </button>

        {isProjectsOpen && (
          <div className="mt-2 space-y-2">
            {loading && (
              <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Cargando proyectos...
              </p>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {!loading && !error && <ProjectList projects={projects} />}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Chats</h3>
        {sortedChats.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aún no hay chats guardados.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedChats.map((chat) => (
              <li key={chat.id}>
                <div
                  className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-sm shadow-sm transition ${
                    activeChatId === chat.id
                      ? "border-slate-500 bg-slate-200 text-slate-900 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <button type="button" onClick={() => onSelectChat(chat.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">{chat.title}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteChat(chat.id)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-red-100 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-900/40 dark:hover:text-red-300"
                    aria-label="Eliminar chat"
                    title="Eliminar chat"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
