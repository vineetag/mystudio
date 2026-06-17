import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { ResolvedConfig } from "./types.ts"

export const DEFAULT_CONFIG: ResolvedConfig = {
  scanDirs: ["apps", "packages"],
  aiModuleSuffix: "lib/ai",
  aiSdkSpecifiers: [
    "@anthropic-ai/sdk",
    "@ai-sdk/",
    "anthropic",
    "openai",
    "@google/generative-ai",
    "@google/genai",
    "cohere-ai",
    "@mistralai/",
    "ai", // the Vercel AI SDK core package
  ],
  aiClientConstructors: [
    "new Anthropic(",
    "new OpenAI(",
    "createAnthropic(",
    "createOpenAI(",
    "GoogleGenerativeAI(",
  ],
  spendCapKeywords: ["MONTHLY", "BUDGET", "spend", "ceiling"],
  rateLimitKeywords: ["DAILY", "LIMIT", "rate", "slot", "quota", "throttle"],
  modelCallPatterns: [
    "messages.create",
    "messages.stream",
    "generateText",
    "streamText",
    "generateObject",
    "streamObject",
    "responses.create",
  ],
  systemPromptWindow: 40,
  disabledRules: [],
  ignoreDirs: [],
}

const CONFIG_FILENAMES = ["ai-cost-guard.config.json", ".ai-cost-guard.json"]

export function loadConfig(rootDir: string): ResolvedConfig {
  for (const name of CONFIG_FILENAMES) {
    const path = join(rootDir, name)
    if (!existsSync(path)) continue
    let parsed: Partial<ResolvedConfig>
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"))
    } catch (err) {
      throw new Error(
        `Could not parse ${name}: ${(err as Error).message}. Fix the JSON or remove the file.`,
      )
    }
    return { ...DEFAULT_CONFIG, ...parsed }
  }
  return { ...DEFAULT_CONFIG }
}
