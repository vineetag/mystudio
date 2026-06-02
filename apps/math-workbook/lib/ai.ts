import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DEFAULT_MODEL = "claude-sonnet-4-6"
const DEFAULT_MAX_TOKENS = 1024

export interface GenerateOptions {
  model?: string
  maxTokens?: number
  userId?: string
}

export async function generateText(
  systemPrompt: string,
  userMessage: string,
  options: GenerateOptions = {},
): Promise<string> {
  const { model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS } = options

  // TODO: enforce per-user rate limits and monthly spend cap against Supabase
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== "text") throw new Error("Unexpected response type from AI")
  return content.text
}
