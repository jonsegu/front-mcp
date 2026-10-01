import type { McpClient, McpToolDefinition, McpToolResult, JsonObject } from "@/lib/mcp/types";

type SdkListToolsResponse = {
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: JsonObject;
  }>;
};

type SdkCallToolResponse = {
  content?: Array<{
    type?: string;
    text?: string;
    json?: unknown;
  }>;
  structuredContent?: unknown;
  isError?: boolean;
};

type SdkClient = {
  connect: (transport: unknown) => Promise<void>;
  listTools: () => Promise<SdkListToolsResponse>;
  callTool: (input: { name: string; arguments: JsonObject }) => Promise<SdkCallToolResponse>;
  close?: () => Promise<void>;
};

type SdkClientConstructor = new (
  details: { name: string; version: string },
  options?: { capabilities?: Record<string, unknown> }
) => SdkClient;

type SdkTransportConstructor = new (url: URL) => { close?: () => Promise<void> };

const MOCK_PROJECTS = ["logical", "sweatworks"];

const MOCK_DOCS: Record<string, string[]> = {
  logical: ["architecture.txt", "terraform.txt", "incidents/postgres.txt"],
  sweatworks: ["architecture.txt", "aws-cognito.txt"]
};

const MOCK_CONTENT: Record<string, Record<string, string>> = {
  logical: {
    "architecture.txt": "Logical architecture uses Next.js, MCP, and Cloud Run services.",
    "terraform.txt": "Terraform provisions Cloud Run services and IAM bindings.",
    "incidents/postgres.txt": "Postgres incident notes and mitigation runbook."
  },
  sweatworks: {
    "architecture.txt": "Sweatworks architecture includes API services and frontend clients.",
    "aws-cognito.txt": "Cognito is configured with user pools, app clients, and MFA policies."
  }
};

function getTimeoutMs(): number {
  const parsed = Number(process.env.MCP_TIMEOUT_MS ?? "30000");
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 30000;
  }
  return parsed;
}

function isMockMode(): boolean {
  return (process.env.USE_MOCK_MCP ?? "false").toLowerCase() === "true";
}

function getMcpServerUrl(): string {
  const value = process.env.MCP_SERVER_URL;
  if (!value) {
    throw new Error("MCP_SERVER_URL is required");
  }
  return value;
}

function validateToolName(name: string): void {
  if (!/^[a-zA-Z0-9_\-.]+$/.test(name)) {
    throw new Error("Invalid MCP tool name");
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return await Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}

function mapToolResult(response: SdkCallToolResponse): McpToolResult {
  if (response.isError) {
    throw new Error("MCP tool returned an error");
  }

  // Prefer structured MCP output when available.
  if (response.structuredContent !== undefined) {
    const structured = response.structuredContent;

    // Python MCP tools commonly return:
    // { result: ... }
    if (
      structured !== null &&
      typeof structured === "object" &&
      !Array.isArray(structured) &&
      "result" in structured
    ) {
      return {
        content: (structured as Record<string, unknown>).result
      };
    }

    return {
      content: structured
    };
  }

  const content = response.content ?? [];

  if (content.length === 1 && content[0].type === "json") {
    return {
      content: content[0].json ?? null
    };
  }

  const textParts = content
    .filter(
      (part) =>
        part.type === "text" &&
        typeof part.text === "string"
    )
    .map((part) => part.text as string);

  if (textParts.length > 0) {
    // Some MCP servers serialize structured values as JSON text.
    if (textParts.length === 1) {
      try {
        const parsed = JSON.parse(textParts[0]);

        if (
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed) &&
          "result" in parsed
        ) {
          return {
            content: (parsed as Record<string, unknown>).result
          };
        }

        return {
          content: parsed
        };
      } catch {
        // Not JSON; return plain text.
      }
    }

    return {
      content: textParts.join("\n")
    };
  }

  return {
    content
  };
}

class StreamableHttpMcpClient implements McpClient {
  private client: SdkClient | null = null;
  private transport: { close?: () => Promise<void> } | null = null;
  private readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
  }

  private async ensureConnected(): Promise<void> {
    if (this.client && this.transport) {
      return;
    }

    const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
      import("@modelcontextprotocol/sdk/client/index.js"),
      import("@modelcontextprotocol/sdk/client/streamableHttp.js")
    ]);

    const ClientCtor = Client as unknown as SdkClientConstructor;
    const TransportCtor = StreamableHTTPClientTransport as unknown as SdkTransportConstructor;

    const transport = new TransportCtor(new URL(getMcpServerUrl()));
    const client = new ClientCtor(
      { name: "documentation-web", version: "0.1.0" },
      { capabilities: {} }
    );

    await withTimeout(client.connect(transport), this.timeoutMs, "MCP connection timeout");

    this.client = client;
    this.transport = transport;
  }

  async listTools(): Promise<McpToolDefinition[]> {
    await this.ensureConnected();
    const response = await withTimeout(this.client!.listTools(), this.timeoutMs, "MCP listTools timeout");
    return (response.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  async callTool(name: string, args: JsonObject): Promise<McpToolResult> {
    validateToolName(name);
    await this.ensureConnected();
    const response = await withTimeout(
      this.client!.callTool({ name, arguments: args }),
      this.timeoutMs,
      `MCP callTool timeout (${name})`
    );
    return mapToolResult(response);
  }

  async close(): Promise<void> {
    const closeOperations: Promise<void>[] = [];

    if (this.client?.close) {
      closeOperations.push(this.client.close());
    }
    if (this.transport?.close) {
      closeOperations.push(this.transport.close());
    }

    if (closeOperations.length > 0) {
      await Promise.allSettled(closeOperations);
    }

    this.client = null;
    this.transport = null;
  }
}

class MockMcpClient implements McpClient {
  async listTools(): Promise<McpToolDefinition[]> {
    return [
      {
        name: "list_projects",
        description: "List all available projects",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "list_documents",
        description: "List project documents",
        inputSchema: {
          type: "object",
          properties: { project: { type: "string" } },
          required: ["project"]
        }
      },
      {
        name: "read_document",
        description: "Read full document",
        inputSchema: {
          type: "object",
          properties: { project: { type: "string" }, document: { type: "string" } },
          required: ["project", "document"]
        }
      },
      {
        name: "search_documentation",
        description: "Search in project documentation",
        inputSchema: {
          type: "object",
          properties: { project: { type: "string" }, query: { type: "string" } },
          required: ["project", "query"]
        }
      }
    ];
  }

  async callTool(name: string, args: JsonObject): Promise<McpToolResult> {
    validateToolName(name);

    if (name === "list_projects") {
      return { content: MOCK_PROJECTS };
    }

    if (name === "list_documents") {
      const project = String(args.project ?? "");
      return { content: MOCK_DOCS[project] ?? [] };
    }

    if (name === "read_document") {
      const project = String(args.project ?? "");
      const document = String(args.document ?? "");
      return { content: MOCK_CONTENT[project]?.[document] ?? "Document not found" };
    }

    if (name === "search_documentation") {
      const project = String(args.project ?? "");
      const query = String(args.query ?? "").toLowerCase();
      const docs = Object.entries(MOCK_CONTENT[project] ?? {});
      const matches = docs
        .filter(([, content]) => content.toLowerCase().includes(query))
        .map(([document, content]) => ({
          document,
          matches: [{ line: 1, text: content, context_before: "", context_after: "" }]
        }));

      return { content: matches };
    }

    throw new Error(`Mock MCP tool not implemented: ${name}`);
  }

  async close(): Promise<void> {
    return;
  }
}

export function createMcpClient(): McpClient {
  if (isMockMode()) {
    return new MockMcpClient();
  }
  return new StreamableHttpMcpClient(getTimeoutMs());
}

export async function listMcpTools(): Promise<McpToolDefinition[]> {
  return await withMcpClient(async (client) => await client.listTools());
}

export async function callMcpTool(name: string, args: JsonObject): Promise<McpToolResult> {
  return await withMcpClient(async (client) => await client.callTool(name, args));
}

export async function withMcpClient<T>(fn: (client: McpClient) => Promise<T>): Promise<T> {
  const client = createMcpClient();
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}
