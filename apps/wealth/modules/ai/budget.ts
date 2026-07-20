import "server-only"

import { createServiceClient } from "@/lib/db"
import type { Analysis, Budget, PromptKey } from "./types"

/** Default monthly cap for a freshly-rolled month, in USD. */
const DEFAULT_LIMIT_USD = 5

/** Per-user runs allowed per rolling hour. Blunt, but it bounds a runaway loop. */
export const RATE_LIMIT_PER_HOUR = 20

export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

function toBudget(month: string, limitUsd: number, spentUsd: number): Budget {
  return {
    month,
    limitUsd,
    spentUsd,
    remainingUsd: Math.max(0, limitUsd - spentUsd),
  }
}

/**
 * The current month's cap. Creates the row on first use of a new month,
 * carrying forward the previous month's limit so a cap the owner raised in
 * /admin doesn't silently reset on the 1st.
 */
export async function getBudget(now = new Date()): Promise<Budget> {
  const month = currentMonth(now)
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("pt_ai_budget")
    .select("month, limit_usd, spent_usd")
    .eq("month", month)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not read the AI budget: ${error.message}`)
  }
  if (data) {
    return toBudget(month, Number(data.limit_usd), Number(data.spent_usd))
  }

  const { data: previous } = await supabase
    .from("pt_ai_budget")
    .select("limit_usd")
    .lt("month", month)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle()

  const limitUsd = previous ? Number(previous.limit_usd) : DEFAULT_LIMIT_USD
  const { error: insertError } = await supabase
    .from("pt_ai_budget")
    .upsert({ month, limit_usd: limitUsd }, { onConflict: "month" })

  if (insertError) {
    throw new Error(`Could not open this month's AI budget: ${insertError.message}`)
  }
  return toBudget(month, limitUsd, 0)
}

/** Owner-only cap change. Callers must have passed `requireOwner()` first. */
export async function setBudgetLimit(
  limitUsd: number,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(limitUsd) || limitUsd < 0) {
    return { ok: false, error: "The monthly cap must be zero or more." }
  }

  await getBudget(now)
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("pt_ai_budget")
    .update({ limit_usd: limitUsd })
    .eq("month", currentMonth(now))

  if (error) {
    return { ok: false, error: `Could not update the monthly cap: ${error.message}` }
  }
  return { ok: true }
}

/**
 * Runs this user started in the last rolling hour. Counted from
 * pt_ai_analyses rather than a separate counter table so it survives
 * deploys and cold starts — a per-instance in-memory limiter would not.
 */
export async function countRecentRuns(
  userId: string,
  now = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const supabase = createServiceClient()

  const { count, error } = await supabase
    .from("pt_ai_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since)

  if (error) {
    throw new Error(`Could not check your recent AI usage: ${error.message}`)
  }
  return count ?? 0
}

export interface RecordAnalysisInput {
  userId: string
  targetType: "symbol" | "portfolio"
  target: string
  promptKey: PromptKey
  model: string
  content: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

/**
 * Persists a completed analysis and refreshes the month's running total.
 *
 * spent_usd is recomputed as a SUM over pt_ai_analyses rather than incremented,
 * so two concurrent runs can't lose an update — the worst case is that one of
 * them writes a total that the other immediately supersedes with a larger one.
 */
export async function recordAnalysis(
  input: RecordAnalysisInput,
  now = new Date(),
): Promise<Analysis> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("pt_ai_analyses")
    .insert({
      user_id: input.userId,
      target_type: input.targetType,
      target: input.target,
      prompt_key: input.promptKey,
      model: input.model,
      content: input.content,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      cost_usd: input.costUsd,
    })
    .select("id, target_type, target, prompt_key, model, content, input_tokens, output_tokens, cost_usd, created_at")
    .single()

  if (error || !data) {
    throw new Error(
      `The analysis ran but could not be saved: ${error?.message ?? "no row returned"}`,
    )
  }

  await refreshMonthSpend(currentMonth(now), now)

  return {
    id: data.id,
    targetType: data.target_type,
    target: data.target,
    promptKey: data.prompt_key,
    model: data.model,
    content: data.content,
    inputTokens: data.input_tokens,
    outputTokens: data.output_tokens,
    costUsd: Number(data.cost_usd),
    createdAt: data.created_at,
  }
}

async function refreshMonthSpend(month: string, now: Date): Promise<void> {
  const supabase = createServiceClient()
  const start = `${month}-01T00:00:00.000Z`
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  ).toISOString()

  const { data, error } = await supabase
    .from("pt_ai_analyses")
    .select("cost_usd")
    .gte("created_at", start)
    .lt("created_at", end)

  if (error) {
    // The analysis is already saved; a stale total is recoverable and must not
    // surface as a failure to the owner. Logged so it's visible in runtime logs.
    console.error(`Could not refresh AI spend for ${month}: ${error.message}`)
    return
  }

  const spent = (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0)
  const { error: updateError } = await supabase
    .from("pt_ai_budget")
    .update({ spent_usd: spent })
    .eq("month", month)

  if (updateError) {
    console.error(`Could not write AI spend for ${month}: ${updateError.message}`)
  }
}

/** Most recent analyses for the owner, newest first. */
export async function listAnalyses(
  userId: string,
  limit = 20,
): Promise<Analysis[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("pt_ai_analyses")
    .select("id, target_type, target, prompt_key, model, content, input_tokens, output_tokens, cost_usd, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    // History is an enhancement — never break the page over it.
    console.error(`pt_ai_analyses read failed: ${error.message}`)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    targetType: row.target_type,
    target: row.target,
    promptKey: row.prompt_key,
    model: row.model,
    content: row.content,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    costUsd: Number(row.cost_usd),
    createdAt: row.created_at,
  }))
}
