import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import type { ActionResultWith } from "@/lib/action-result"
import {
  countRecentRuns,
  getBudget,
  RATE_LIMIT_PER_HOUR,
} from "@/modules/ai/budget"
import { costUsd, estimateCost, MODELS, type ModelTier } from "@/modules/ai/pricing"

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
const HARD_MAX_TOKENS = 4000

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
  const estimate = estimateCost(tier, `${systemPrompt}\n${userMessage}`, maxTokens)
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

  // 3. Call. Thinking is left off across all tiers: it is billed output, and a
  // predictable per-run cost is the point of this app.
  let response: Anthropic.Message
  try {
    response = await client().messages.create({
      model: model.id,
      max_tokens: maxTokens,
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

  if (text.length === 0) {
    return { ok: false, error: "The model returned an empty response. Try running it again." }
  }

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens

  return {
    ok: true,
    data: {
      text,
      modelId: model.id,
      inputTokens,
      outputTokens,
      // Billed from the API's own token counts, never the pre-run estimate.
      costUsd: costUsd(tier, inputTokens, outputTokens),
    },
  }
}
