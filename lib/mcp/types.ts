export type JsonObject = Record<string, unknown>;

export type McpToolDefinition = {
  name: string;
  description?: string;
  inputSchema?: JsonObject;
};

export type McpToolResult = {
  content: unknown;
};

export type McpToolCall = {
  name: string;
  arguments: JsonObject;
};

export interface McpClient {
  listTools(): Promise<McpToolDefinition[]>;
  callTool(name: string, args: JsonObject): Promise<McpToolResult>;
  close(): Promise<void>;
}
