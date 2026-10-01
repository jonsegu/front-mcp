import type { McpToolDefinition } from "@/lib/mcp/types";
import type { LlmTool } from "@/lib/llm/types";

export function mapMcpToolsToLlmTools(tools: McpToolDefinition[]): LlmTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "MCP tool",
    inputSchema: tool.inputSchema ?? { type: "object", properties: {} }
  }));
}
