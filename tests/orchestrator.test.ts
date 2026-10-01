import { afterEach, describe, expect, it } from "vitest";
import { createChatOrchestrator } from "@/lib/chat/orchestrator";
import type { LlmGenerateInput, LlmGenerateOutput, LlmProvider } from "@/lib/llm/types";
import type { JsonObject, McpClient, McpToolDefinition, McpToolResult } from "@/lib/mcp/types";

class FakeMcpClient implements McpClient {
  constructor(
    private readonly tools: McpToolDefinition[],
    private readonly callImpl: (name: string, args: JsonObject) => Promise<McpToolResult>
  ) {}

  async listTools(): Promise<McpToolDefinition[]> {
    return this.tools;
  }

  async callTool(name: string, args: JsonObject): Promise<McpToolResult> {
    return await this.callImpl(name, args);
  }

  async close(): Promise<void> {
    return;
  }
}

class SequenceLlmProvider implements LlmProvider {
  private index = 0;

  constructor(private readonly outputs: LlmGenerateOutput[]) {}

  async generate(_input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const current = this.outputs[this.index] ?? this.outputs[this.outputs.length - 1];
    this.index += 1;
    return current;
  }
}

describe("chat orchestrator", () => {
  afterEach(() => {
    delete process.env.MAX_TOOL_ITERATIONS;
  });

  it("handles tool calls and returns final response", async () => {
    const mcp = new FakeMcpClient(
      [
        {
          name: "search_documentation",
          inputSchema: { type: "object", properties: {} }
        }
      ],
      async () => ({ content: [{ document: "terraform.txt", matches: [{ line: 1, text: "Terraform" }] }] })
    );

    const llm = new SequenceLlmProvider([
      {
        text: "",
        toolCalls: [
          {
            id: "1",
            name: "search_documentation",
            arguments: { project: "logical", query: "terraform" }
          }
        ]
      },
      {
        text: "Según la documentación, Terraform está configurado en logical.",
        toolCalls: []
      }
    ]);

    const orchestrator = createChatOrchestrator({ llmProvider: llm, mcpClient: mcp });
    const result = await orchestrator.run({ message: "Busca terraform", history: [] });

    expect(result.message).toContain("Terraform");
    expect(result.toolCalls).toEqual(["search_documentation"]);
  });

  it("enforces MAX_TOOL_ITERATIONS", async () => {
    process.env.MAX_TOOL_ITERATIONS = "2";

    const mcp = new FakeMcpClient(
      [
        {
          name: "list_projects",
          inputSchema: { type: "object", properties: {} }
        }
      ],
      async () => ({ content: ["logical"] })
    );

    const llm = new SequenceLlmProvider([
      {
        text: "",
        toolCalls: [{ id: "1", name: "list_projects", arguments: {} }]
      },
      {
        text: "",
        toolCalls: [{ id: "2", name: "list_projects", arguments: {} }]
      },
      {
        text: "",
        toolCalls: [{ id: "3", name: "list_projects", arguments: {} }]
      }
    ]);

    const orchestrator = createChatOrchestrator({ llmProvider: llm, mcpClient: mcp });
    const result = await orchestrator.run({ message: "hola", history: [] });

    expect(result.message).toContain("límite de iteraciones");
    expect(result.toolCalls.length).toBe(2);
  });

  it("surfaces MCP errors", async () => {
    const mcp = new FakeMcpClient(
      [
        {
          name: "read_document",
          inputSchema: { type: "object", properties: {} }
        }
      ],
      async () => {
        throw new Error("MCP unavailable");
      }
    );

    const llm = new SequenceLlmProvider([
      {
        text: "",
        toolCalls: [{ id: "1", name: "read_document", arguments: { project: "logical", document: "x" } }]
      }
    ]);

    const orchestrator = createChatOrchestrator({ llmProvider: llm, mcpClient: mcp });
    await expect(orchestrator.run({ message: "lee doc", history: [] })).rejects.toThrow("MCP unavailable");
  });
});
