import { describe, expect, it } from "vitest";
import { handleChatRequest } from "@/app/api/chat/route";

describe("POST /api/chat validation", () => {
  it("rejects empty message", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "   ",
        history: []
      })
    });

    const response = await handleChatRequest(request);
    expect(response.status).toBe(400);
  });

  it("rejects too large history", async () => {
    const history = Array.from({ length: 60 }).map((_, index) => ({
      id: String(index),
      role: "user",
      content: "hello"
    }));

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "hola",
        history
      })
    });

    const response = await handleChatRequest(request);
    expect(response.status).toBe(400);
  });
});
