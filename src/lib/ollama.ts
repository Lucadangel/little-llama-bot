import { Ollama } from "ollama";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3";

const client = new Ollama({ host: OLLAMA_BASE_URL });

export async function ollamaChat(
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await client.chat({
    model: OLLAMA_MODEL,
    messages: messages as { role: "user" | "assistant" | "system"; content: string }[],
    stream: false,
  });
  return response.message.content;
}

export async function* ollamaChatStream(
  messages: { role: string; content: string }[]
): AsyncGenerator<string> {
  const response = await client.chat({
    model: OLLAMA_MODEL,
    messages: messages as { role: "user" | "assistant" | "system"; content: string }[],
    stream: true,
  });
  for await (const chunk of response) {
    if (chunk.message?.content) {
      yield chunk.message.content;
    }
  }
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}
