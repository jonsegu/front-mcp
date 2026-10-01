import { GeminiProvider } from "@/lib/llm/gemini";
import type { LlmProvider } from "@/lib/llm/types";

export function createLlmProvider(): LlmProvider {
  const provider = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();

  if (provider === "gemini") {
    return new GeminiProvider();
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}
