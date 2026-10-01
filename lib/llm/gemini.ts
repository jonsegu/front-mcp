import { VertexAI } from "@google-cloud/vertexai";
import { FunctionDeclarationSchemaType, type Content, type FunctionDeclaration, type FunctionDeclarationSchema, type Part } from "@google-cloud/vertexai";
import type { LlmGenerateInput, LlmGenerateOutput, LlmMessage, LlmProvider, LlmToolCall } from "@/lib/llm/types";

const SYSTEM_PROMPT = `You are a technical documentation assistant.

Your role is to answer questions using the user's project documentation.

When the answer depends on project documentation, use the available MCP tools rather than inventing information.

Use list_projects when you need to discover available projects.

Use list_documents when you need to inspect the documents available in a project.

Use search_documentation to find relevant information.

Use read_document when the complete or additional context of a document is necessary.

Do not fabricate documentation content.

Clearly indicate when information cannot be found in the documentation.

Prefer targeted searches before reading entire documents.`;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function mapSchemaType(value: unknown): FunctionDeclarationSchemaType {
  if (typeof value !== "string") {
    return FunctionDeclarationSchemaType.STRING;
  }

  switch (value.toLowerCase()) {
    case "string":
      return FunctionDeclarationSchemaType.STRING;
    case "number":
      return FunctionDeclarationSchemaType.NUMBER;
    case "integer":
      return FunctionDeclarationSchemaType.INTEGER;
    case "boolean":
      return FunctionDeclarationSchemaType.BOOLEAN;
    case "array":
      return FunctionDeclarationSchemaType.ARRAY;
    case "object":
      return FunctionDeclarationSchemaType.OBJECT;
    default:
      return FunctionDeclarationSchemaType.STRING;
  }
}

function toFunctionDeclarationSchema(schema: Record<string, unknown>): FunctionDeclarationSchema {
  const properties =
    typeof schema.properties === "object" && schema.properties !== null
      ? Object.entries(schema.properties as Record<string, unknown>).reduce<Record<string, { type?: FunctionDeclarationSchemaType; description?: string; properties?: Record<string, unknown>; required?: string[] }>>((acc, [name, property]) => {
          if (typeof property !== "object" || property === null) {
            acc[name] = { type: FunctionDeclarationSchemaType.STRING };
            return acc;
          }

          const rawProperty = property as Record<string, unknown>;
          acc[name] = {
            type: mapSchemaType(rawProperty.type),
            description: typeof rawProperty.description === "string" ? rawProperty.description : undefined
          };
          return acc;
        }, {})
      : {};

  const required = Array.isArray(schema.required)
    ? schema.required.filter((value): value is string => typeof value === "string")
    : undefined;

  return {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties,
    required
  };
}

function toGeminiMessages(messages: LlmMessage[]): Content[] {
  const result: Content[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      continue;
    }

    if (message.role === "tool" && message.name) {
      result.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: message.name,
              response: {
                content: message.content
              }
            }
          }
        ]
      });
      continue;
    }

    result.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    });
  }

  return result;
}

function parseToolCalls(parts: Part[]): LlmToolCall[] {
  const calls: LlmToolCall[] = [];

  for (const part of parts) {
    const functionCall = "functionCall" in part ? part.functionCall : undefined;
    if (!functionCall || typeof functionCall !== "object") {
      continue;
    }

    const functionName = (functionCall as { name?: unknown }).name;
    const args = (functionCall as { args?: unknown }).args;

    if (typeof functionName !== "string") {
      continue;
    }

    calls.push({
      id: crypto.randomUUID(),
      name: functionName,
      arguments: typeof args === "object" && args !== null ? (args as Record<string, unknown>) : {}
    });
  }

  return calls;
}

function parseText(parts: Part[]): string {
  const fragments = parts
    .map((part) => ("text" in part ? part.text : undefined))
    .filter((text): text is string => typeof text === "string" && text.trim().length > 0);

  return fragments.join("\n").trim();
}

export class GeminiProvider implements LlmProvider {
  private readonly modelName: string;
  private readonly vertex: VertexAI;

  constructor() {
    this.modelName = getRequiredEnv("GEMINI_MODEL");
    this.vertex = new VertexAI({
      project: getRequiredEnv("GOOGLE_CLOUD_PROJECT"),
      location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1"
    });
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const model = this.vertex.getGenerativeModel({
      model: this.modelName,
      systemInstruction: {
        role: "system",
        parts: [{ text: SYSTEM_PROMPT }]
      }
    });

    const response = await model.generateContent({
      contents: toGeminiMessages(input.messages),
      tools: [
        {
          functionDeclarations: input.tools.map<FunctionDeclaration>((tool) => {
            const schema = toFunctionDeclarationSchema(tool.inputSchema);
            return {
              name: tool.name,
              description: tool.description,
              parameters: schema
            };
          })
        }
      ]
    });

    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    return {
      text: parseText(parts),
      toolCalls: parseToolCalls(parts)
    };
  }
}
