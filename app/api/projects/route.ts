import { NextResponse } from "next/server";
import { withMcpClient } from "@/lib/mcp/client";

type ProjectsPayload = {
  projects: string[];
};

function toProjectList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export async function GET() {
  try {
    const projects = await withMcpClient(async (client) => {
      const result = await client.callTool("list_projects", {});
      return toProjectList(result.content);
    });

    return NextResponse.json<ProjectsPayload>({ projects }, { status: 200 });
} catch (error) {
  console.error("GET /api/projects MCP error:", error);

  return NextResponse.json(
    { error: "No se pudieron obtener los proyectos desde MCP." },
    { status: 502 }
  );
}
}
