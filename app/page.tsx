"use client";

import { useEffect, useState } from "react";
import { Chat } from "@/components/Chat";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import type { ChatMessage } from "@/types/chat";

type ProjectsResponse = {
  projects: string[];
};

type SavedChat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

function buildChatTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) {
    return "Untitled chat";
  }
  return firstUserMessage.content.slice(0, 40) || "Untitled chat";
}

export default function HomePage() {
  const [projects, setProjects] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      setLoadingProjects(true);
      setProjectsError(null);

      try {
        const response = await fetch("/api/projects");
        const payload = (await response.json()) as { error?: string } & ProjectsResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudieron cargar los proyectos.");
        }

        if (isMounted) {
          setProjects(payload.projects);
        }
      } catch (unknownError) {
        if (!isMounted) {
          return;
        }
        const message = unknownError instanceof Error ? unknownError.message : "Error inesperado.";
        setProjectsError(message);
      } finally {
        if (isMounted) {
          setLoadingProjects(false);
        }
      }
    }

    void loadProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    setSavedChats((current) =>
      current.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages,
              title: buildChatTitle(messages),
              updatedAt: Date.now()
            }
          : chat
      )
    );
  }, [messages, activeChatId]);

  function handleNewChat() {
    if (messages.length > 0 && !activeChatId) {
      const newSavedChat: SavedChat = {
        id: crypto.randomUUID(),
        title: buildChatTitle(messages),
        messages,
        updatedAt: Date.now()
      };

      setSavedChats((current) => [newSavedChat, ...current]);
    }

    setActiveChatId(null);
    setMessages([]);
  }

  function handleSelectChat(chatId: string) {
    const selectedChat = savedChats.find((chat) => chat.id === chatId);
    if (!selectedChat) {
      return;
    }

    setActiveChatId(chatId);
    setMessages(selectedChat.messages);
  }

  function handleDeleteChat(chatId: string) {
    setSavedChats((current) => current.filter((chat) => chat.id !== chatId));

    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }
  }

  return (
    <main className="flex h-screen flex-col bg-slate-200 dark:bg-slate-950">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar
          projects={projects}
          loading={loadingProjects}
          error={projectsError}
          onNewChat={handleNewChat}
          savedChats={savedChats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
        />
        <Chat messages={messages} onMessagesChange={setMessages} />
      </div>
    </main>
  );
}
