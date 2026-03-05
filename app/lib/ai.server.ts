import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function askClaude(prompt: string, systemPrompt?: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt || "You are an AI assistant analyzing Shopify store data.",
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

export async function askClaudeJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const text = await askClaude(
    prompt + "\n\nRespond with valid JSON only. No markdown, no explanation.",
    systemPrompt,
  );
  return JSON.parse(text) as T;
}
