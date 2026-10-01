import { createLlmProvider } from "@/lib/llm/provider";
import type { LlmMessage, LlmProvider } from "@/lib/llm/types";
import { createMcpClient } from "@/lib/mcp/client";
import type { JsonObject, McpClient } from "@/lib/mcp/types";
import { mapMcpToolsToLlmTools } from "@/lib/mcp/tools";
import type { ChatMessage } from "@/types/chat";

export type OrchestratorInput = {
  message: string;
  history: ChatMessage[];
};

export type OrchestratorOutput = {
  message: string;
  toolCalls: string[];
};

export type ChatOrchestrator = {
  run: (input: OrchestratorInput) => Promise<OrchestratorOutput>;
};

function toLlmMessages(history: ChatMessage[], userMessage: string): LlmMessage[] {
  const messages: LlmMessage[] = [];

  for (const msg of history) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }

  messages.push({
    role: "user",
    content: userMessage
  });

  return messages;
}

function getMaxToolIterations(): number {
  const parsed = Number(process.env.MAX_TOOL_ITERATIONS ?? "8");
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 8;
  }
  return parsed;
}

function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "Tool result could not be serialized";
  }
}

export function createChatOrchestrator(deps?: {
  llmProvider?: LlmProvider;
  mcpClient?: McpClient;
}): ChatOrchestrator {
  const llmProvider = deps?.llmProvider ?? createLlmProvider();
  const externalMcpClient = deps?.mcpClient;

  return {
    async run(input: OrchestratorInput): Promise<OrchestratorOutput> {
      const maxIterations = getMaxToolIterations();
      const mcpClient = externalMcpClient ?? createMcpClient();

      const toolNamesUsed: string[] = [];
      const messages = toLlmMessages(input.history, input.message);

      try {
        const availableTools = await mcpClient.listTools();
        const llmTools = mapMcpToolsToLlmTools(availableTools);
        const allowedToolNames = new Set(availableTools.map((tool) => tool.name));

        for (let iteration = 0; iteration < maxIterations; iteration += 1) {
          const generation = await llmProvider.generate({ messages, tools: llmTools });

          if (generation.toolCalls.length === 0) {
            const content = generation.text.trim();
            return {
              message: content.length > 0 ? content : "No encontré información suficiente en la documentación.",
              toolCalls: toolNamesUsed
            };
          }

          for (const toolCall of generation.toolCalls) {
            if (!allowedToolNames.has(toolCall.name)) {
              throw new Error(`Tool not allowed: ${toolCall.name}`);
            }

            const toolArgs: JsonObject = toolCall.arguments;
            const toolResult = await mcpClient.callTool(toolCall.name, toolArgs);

            toolNamesUsed.push(toolCall.name);
            messages.push({
              role: "tool",
              name: toolCall.name,
              content: safeSerialize(toolResult.content)
            });
          }
        }

        return {
          message: "La solicitud excedió el límite de iteraciones de tools. Intenta con una pregunta más específica.",
          toolCalls: toolNamesUsed
        };
      } finally {
        if (!externalMcpClient) {
          await mcpClient.close();
        }
      }
    }
  };
}
