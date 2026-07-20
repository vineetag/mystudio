// Model catalog and cost math. Pure — no I/O, unit-tested.
//
// Prices are USD per million tokens, list rate. We deliberately ignore
// promotional/intro pricing: a spend cap that under-estimates is worse than
// one that over-estimates, and the actual cost recorded after each run comes
// from the API's own token counts.

export type ModelTier = "fast" | "standard" | "deep"

export interface ModelSpec {
  tier: ModelTier
  /** Exact model id sent to the Anthropic API. */
  id: string
  label: string
  /** One-line description shown next to the tier picker. */
  blurb: string
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}

/**
 * Haiku is the default (PRODUCT_SPEC.md: "Haiku default, Sonnet opt-in") —
 * this app's whole point is bounded spend. Opus is available for the rare
 * deep dive where the owner accepts ~5x the cost.
 */
export const MODELS: Record<ModelTier, ModelSpec> = {
  fast: {
    tier: "fast",
    id: "claude-haiku-4-5",
    label: "Fast",
    blurb: "Cheapest. Good for a quick read on a single holding.",
    inputUsdPerMTok: 1,
    outputUsdPerMTok: 5,
  },
  standard: {
    tier: "standard",
    id: "claude-sonnet-5",
    label: "Standard",
    blurb: "Better reasoning across many positions. ~3x the cost of Fast.",
    inputUsdPerMTok: 3,
    outputUsdPerMTok: 15,
  },
  deep: {
    tier: "deep",
    id: "claude-opus-4-8",
    label: "Deep",
    blurb: "Most capable. Reserve for full-portfolio reviews.",
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
  },
}

export const DEFAULT_TIER: ModelTier = "fast"

export const MODEL_TIERS: ModelTier[] = ["fast", "standard", "deep"]

export function isModelTier(value: string): value is ModelTier {
  return value === "fast" || value === "standard" || value === "deep"
}

/**
 * Fallback token count, used only when the token-counting API is unreachable.
 *
 * 1.9 chars/token, NOT the ~3.6 that English prose runs at: our context blocks
 * are dense numerics and tickers ("- NVDA | qty 41 | price 187.22 | ..."),
 * which tokenize far worse than prose. Measured against the real portfolio,
 * a 3.6 divisor under-quoted by 88% — unacceptable for something whose job is
 * to bound spend. Prefer `countPromptTokens` in lib/ai.ts, which is exact.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0
  return Math.ceil(text.length / 1.9)
}

export function costUsd(
  tier: ModelTier,
  inputTokens: number,
  outputTokens: number,
): number {
  const model = MODELS[tier]
  const input = (inputTokens / 1_000_000) * model.inputUsdPerMTok
  const output = (outputTokens / 1_000_000) * model.outputUsdPerMTok
  // 6 decimals matches pt_ai_analyses.cost_usd — a Haiku run can cost well
  // under a cent, and rounding to cents would record every one of them as $0.
  return Math.round((input + output) * 1_000_000) / 1_000_000
}

export interface CostEstimate {
  tier: ModelTier
  modelId: string
  inputTokens: number
  /** The max_tokens we'll request — the worst case we quote the owner. */
  maxOutputTokens: number
  /** Cost if the model uses every output token it's allowed. */
  maxCostUsd: number
}

/**
 * Pre-run estimate. Quotes the worst case (full `maxOutputTokens`) because an
 * estimate the owner can exceed is not a spend cap.
 *
 * `inputTokens` comes from the token-counting API (exact) — see
 * `countPromptTokens` in lib/ai.ts. Pass `estimateTokens(text)` only as a
 * fallback.
 */
export function estimateCost(
  tier: ModelTier,
  inputTokens: number,
  maxOutputTokens: number,
): CostEstimate {
  return {
    tier,
    modelId: MODELS[tier].id,
    inputTokens,
    maxOutputTokens,
    maxCostUsd: costUsd(tier, inputTokens, maxOutputTokens),
  }
}
