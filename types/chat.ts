export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  toolCalls?: string[];
};

export type ChatRequestBody = {
  message: string;
  history: ChatMessage[];
};

export type ChatResponseBody = {
  message: string;
  toolCalls: string[];
};
