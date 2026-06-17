import type { Rule } from "../types.ts"
import { aiCallsThroughModule } from "./ai-calls-through-module.ts"
import { capsEnforced } from "./caps-enforced.ts"
import { systemPromptRequired } from "./system-prompt-required.ts"

export const ALL_RULES: Rule[] = [
  aiCallsThroughModule,
  capsEnforced,
  systemPromptRequired,
]
