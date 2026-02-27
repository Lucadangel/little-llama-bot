import axios from "axios";

// Call your local LLM (Ollama) and get the response
export async function askOllama(prompt: string, model = "llama2") {
  const { data } = await axios.post("http://localhost:11434/api/generate", {
    model,
    prompt,
  });
  return data.response;
}