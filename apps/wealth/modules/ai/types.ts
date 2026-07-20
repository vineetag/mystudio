import type { ModelTier } from "./pricing"

/** Which analysis to run. Mirrors pt_ai_prompts.key. */
export type PromptKey = "stock" | "portfolio" | "research"

export function isPromptKey(value: string): value is PromptKey {
  return value === "stock" || value === "portfolio" || value === "research"
}

export interface PromptTemplate {
  key: PromptKey
  label: string
  description: string
  systemPrompt: string
  userTemplate: string
  updatedAt: string
}

export interface Analysis {
  id: string
  targetType: "symbol" | "portfolio"
  target: string
  promptKey: PromptKey
  model: string
  content: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  createdAt: string
  /** True when the text came from the canned demo set, not the API. */
  isDemo?: boolean
}

export interface Budget {
  month: string
  limitUsd: number
  spentUsd: number
  remainingUsd: number
}

/** Everything the run form needs to quote a price before the owner commits. */
export interface RunEstimate {
  tier: ModelTier
  modelId: string
  inputTokens: number
  maxOutputTokens: number
  maxCostUsd: number
  budget: Budget
  /** True when this run's worst case would push the month past its cap. */
  exceedsBudget: boolean
}
