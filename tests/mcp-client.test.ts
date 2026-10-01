import { afterEach, describe, expect, it } from "vitest";
import { createMcpClient } from "@/lib/mcp/client";

describe("MCP client abstraction", () => {
  afterEach(() => {
    process.env.USE_MOCK_MCP = "false";
  });

  it("returns mock projects in mock mode", async () => {
    process.env.USE_MOCK_MCP = "true";

    const client = createMcpClient();
    const result = await client.callTool("list_projects", {});
    await client.close();

    expect(result.content).toEqual(["logical", "sweatworks"]);
  });

  it("throws on invalid tool names", async () => {
    process.env.USE_MOCK_MCP = "true";

    const client = createMcpClient();
    await expect(client.callTool("bad tool", {})).rejects.toThrow("Invalid MCP tool name");
    await client.close();
  });
});
