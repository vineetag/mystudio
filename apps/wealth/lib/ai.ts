import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import type { ActionResultWith } from "@/lib/action-result"
import {
  countRecentRuns,
  getBudget,
  RATE_LIMIT_PER_HOUR,
} from "@/modules/ai/budget"
import {
  costUsd,
  estimateCost,
  estimateTokens,
  MODELS,
  type ModelTier,
} from "@/modules/ai/pricing"

/**
 * The single audited path to the Claude API (studio rule: no component, page,
 * or module calls Anthropic directly). Everything that bounds spend is enforced
 * here, before the request goes out:
 *
 *   1. a per-user rolling-hour rate limit
 *   2. a hard monthly spend cap, checked against this run's WORST case
 *   3. a mandatory system prompt — raw user input is never sent alone
 *
 * Imports reach into modules/ai/{budget,pricing} rather than the module's
 * index.ts on purpose: those two files are leaves, and going through the index
 * would pull in modules/ai/actions.ts, which imports this file — a cycle.
 */

const DEFAULT_MAX_TOKENS = 1500

/** Cap on any single run, whatever a caller asks for. Bounds one-shot blowups. */
const HARD_MAX_TOKENS = 8000

/**
 * Thinking is explicitly disabled on every tier.
 *
 * This is load-bearing, not a default: with `thinking` omitted, Sonnet 5 runs
 * ADAPTIVE thinking, and on a real 88-holding portfolio it spent the entire
 * 2,000-token output budget on reasoning — returning a thinking block, zero
 * text, and stop_reason "max_tokens". Thinking tokens are billed output, so
 * leaving it on would also make the quoted cost meaningless.
 */
const THINKING = { type: "disabled" } as const

/**
 * Exact input-token count for a prompt, straight from the token-counting API
 * (free, and it uses the real tokenizer). Falls back to the char heuristic if
 * the call fails, so a quote is always available — the heuristic errs high.
 */
export async function countPromptTokens(
  tier: ModelTier,
  systemPrompt: string,
  userMessage: string,
): Promise<number> {
  try {
    const counted = await client().messages.countTokens({
      model: MODELS[tier].id,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })
    return counted.input_tokens
  } catch {
    return estimateTokens(`${systemPrompt}\n${userMessage}`)
  }
}

export interface RunOptions {
  /** Owner's Supabase user id — the rate-limit subject. */
  userId: string
  tier: ModelTier
  systemPrompt: string
  userMessage: string
  maxTokens?: number
}

export interface RunResult {
  text: string
  modelId: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  /** True when the model hit max_tokens — the text is real but cut off. */
  truncated: boolean
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set on the server, so AI analysis is unavailable.",
    )
  }
  return new Anthropic({ apiKey })
}

/**
 * Runs one analysis. Returns a typed refusal rather than throwing for the
 * expected failure modes (rate limit, cap, upstream error) so the UI can show
 * the owner exactly what stopped it and what to do next.
 */
export async function runAnalysis(
  options: RunOptions,
): Promise<ActionResultWith<RunResult>> {
  const { userId, tier, systemPrompt, userMessage } = options
  const model = MODELS[tier]
  const maxTokens = Math.min(options.maxTokens ?? DEFAULT_MAX_TOKENS, HARD_MAX_TOKENS)

  if (systemPrompt.trim().length === 0) {
    // A missing system prompt means an edit in /admin blanked it. Refuse rather
    // than send bare user text to the model.
    return {
      ok: false,
      error:
        "This analysis has no system prompt. Restore it in Admin → AI prompts before running it.",
    }
  }

  // 1. Rate limit.
  const recentRuns = await countRecentRuns(userId)
  if (recentRuns >= RATE_LIMIT_PER_HOUR) {
    return {
      ok: false,
      error: `Rate limit reached: ${RATE_LIMIT_PER_HOUR} analyses per hour. Try again later.`,
    }
  }

  // 2. Hard monthly cap, checked against the worst case for this run.
  const budget = await getBudget()
  const inputTokens = await countPromptTokens(tier, systemPrompt, userMessage)
  const estimate = estimateCost(tier, inputTokens, maxTokens)
  if (budget.spentUsd + estimate.maxCostUsd > budget.limitUsd) {
    return {
      ok: false,
      error:
        `This run could cost up to $${estimate.maxCostUsd.toFixed(4)}, which would push ` +
        `${budget.month} past its $${budget.limitUsd.toFixed(2)} cap ` +
        `($${budget.spentUsd.toFixed(4)} spent so far). Raise the cap in Admin, ` +
        `or pick a cheaper model.`,
    }
  }

  // 3. Call.
  let response: Anthropic.Message
  try {
    response = await client().messages.create({
      model: model.id,
      max_tokens: maxTokens,
      thinking: THINKING,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Anthropic rate-limited this request. Try again in a minute." }
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY." }
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `Anthropic returned ${error.status}: ${error.message}` }
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The AI request failed.",
    }
  }

  if (response.stop_reason === "refusal") {
    return {
      ok: false,
      error: "The model declined to answer this request. Try rewording the prompt template.",
    }
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim()

  const truncated = response.stop_reason === "max_tokens"

  if (text.length === 0) {
    // Say which failure this was. "Try again" is useless advice if the run is
    // deterministically too big for its output budget.
    const blocks = response.content.map((block) => block.type).join(", ") || "none"
    return {
      ok: false,
      error: truncated
        ? `The model used its entire ${maxTokens}-token output budget without producing an answer (blocks: ${blocks}). This portfolio may be too large for this analysis — try the Fast model or a single holding.`
        : `The model returned no text (stop reason: ${response.stop_reason ?? "unknown"}, blocks: ${blocks}).`,
    }
  }

  const usedInputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens

  return {
    ok: true,
    data: {
      text,
      modelId: model.id,
      inputTokens: usedInputTokens,
      outputTokens,
      // Billed from the API's own token counts, never the pre-run estimate.
      costUsd: costUsd(tier, usedInputTokens, outputTokens),
      truncated,
    },
  }
}
