export type LlmRole = "system" | "user" | "assistant" | "tool";

export type LlmMessage = {
  role: LlmRole;
  content: string;
  name?: string;
};

export type LlmTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type LlmToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type LlmGenerateInput = {
  messages: LlmMessage[];
  tools: LlmTool[];
};

export type LlmGenerateOutput = {
  text: string;
  toolCalls: LlmToolCall[];
};

export interface LlmProvider {
  generate(input: LlmGenerateInput): Promise<LlmGenerateOutput>;
}
