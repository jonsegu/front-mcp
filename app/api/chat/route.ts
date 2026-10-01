import { NextResponse } from "next/server";
import { z } from "zod";
import { createChatOrchestrator } from "@/lib/chat/orchestrator";

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(4000, "Message is too long"),
  history: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
        toolCalls: z.array(z.string().max(200)).optional()
      })
    )
    .max(50)
});

export async function handleChatRequest(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        details: parsed.error.issues.map((issue) => issue.message)
      },
      { status: 400 }
    );
  }

  try {
    const orchestrator = createChatOrchestrator();
    const response = await orchestrator.run({
      message: parsed.data.message,
      history: parsed.data.history
    });

    return NextResponse.json(response, { status: 200 });
} catch (error) {
  console.error("POST /api/chat failed:", error);

  return NextResponse.json(
    {
      error: "No se pudo procesar la solicitud en este momento."
    },
    { status: 500 }
  );
 }
}

export async function POST(request: Request) {
  return handleChatRequest(request);
}
