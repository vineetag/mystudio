"use server"

import { revalidatePath } from "next/cache"
import {
  ACCOUNT_TYPE_LABELS,
  listViewerAccountsWithHoldings,
} from "@/modules/accounts"
import { getViewer, requireOwner } from "@/modules/auth"
import { assetClassMapFromAccounts, normalizeSymbol, validateSymbol } from "@/modules/holdings"
import {
  consolidate,
  derivePositions,
  portfolioTotal,
  type ConsolidatedRow,
  type PortfolioTotal,
} from "@/modules/portfolio"
import { getQuotes } from "@/modules/quotes"
import { getSymbols } from "@/modules/symbols"
import type { ActionResult, ActionResultWith } from "@/lib/action-result"
import { countPromptTokens, runAnalysis as callModel } from "@/lib/ai"
import {
  countRecentRuns,
  getBudget,
  recordAnalysis,
  setBudgetLimit,
  RATE_LIMIT_PER_HOUR,
} from "./budget"
import {
  buildHoldingContext,
  buildPortfolioContext,
  buildResearchContext,
} from "./context"
import { demoAnalysis } from "./demo"
import { getPromptTemplate, savePromptTemplate } from "./prompts"
import { estimateCost, isModelTier, type ModelTier } from "./pricing"
import { renderTemplate } from "./template"
import { isPromptKey, type Analysis, type PromptKey, type RunEstimate } from "./types"

/**
 * Output ceiling per prompt. Portfolio reviews need far more room than one
 * holding: at 2,000 tokens a real 88-holding review was cut off mid-answer on
 * both Sonnet and Opus. The owner still sees the worst-case cost of this
 * budget before committing, so a generous ceiling is honest rather than risky.
 */
const MAX_TOKENS: Record<PromptKey, number> = {
  stock: 1500,
  portfolio: 4000,
  research: 2000,
}

interface BuiltPrompt {
  systemPrompt: string
  userMessage: string
  targetType: "symbol" | "portfolio"
  target: string
  maxTokens: number
}

/**
 * Assembles the exact prompt a run would send. Shared by the estimate and the
 * run so the quoted cost is derived from the same bytes that get billed.
 */
async function buildPrompt(
  key: PromptKey,
  rawSymbol: string,
): Promise<ActionResultWith<BuiltPrompt>> {
  const template = await getPromptTemplate(key)
  const now = new Date()

  if (key === "portfolio") {
    const { rows, total, accounts } = await loadPortfolio()
    if (rows.length === 0) {
      return {
        ok: false,
        error: "There are no holdings to analyze. Add an account and some holdings first.",
      }
    }
    return {
      ok: true,
      data: {
        systemPrompt: template.systemPrompt,
        userMessage: renderTemplate(template.userTemplate, {
          context: buildPortfolioContext({ rows, total, accounts, asOf: now }),
        }),
        targetType: "portfolio",
        target: "ALL",
        maxTokens: MAX_TOKENS.portfolio,
      },
    }
  }

  const symbol = normalizeSymbol(rawSymbol)
  const symbolError = validateSymbol(symbol)
  if (symbolError) return { ok: false, error: symbolError }

  if (key === "stock") {
    const { rows, total } = await loadPortfolio()
    const row = rows.find((candidate) => candidate.symbol === symbol)
    if (!row) {
      return {
        ok: false,
        error: `You don't hold ${symbol}. Use "Research a ticker" for symbols outside your portfolio.`,
      }
    }
    return {
      ok: true,
      data: {
        systemPrompt: template.systemPrompt,
        userMessage: renderTemplate(template.userTemplate, {
          symbol,
          context: buildHoldingContext(row, total, now),
        }),
        targetType: "symbol",
        target: symbol,
        maxTokens: MAX_TOKENS.stock,
      },
    }
  }

  // research — the symbol is not held, so a quote is all the live data we have.
  const quotes = await getQuotes([symbol])
  const quote = quotes.get(symbol)
  return {
    ok: true,
    data: {
      systemPrompt: template.systemPrompt,
      userMessage: renderTemplate(template.userTemplate, {
        symbol,
        context: buildResearchContext(
          symbol,
          quote && quote.price !== null
            ? {
                price: quote.price,
                dayChangePct: quote.dayChangePct,
                fetchedAt: quote.fetchedAt,
              }
            : null,
          now,
        ),
      }),
      targetType: "symbol",
      target: symbol,
      maxTokens: MAX_TOKENS.research,
    },
  }
}

interface LoadedPortfolio {
  rows: ConsolidatedRow[]
  total: PortfolioTotal
  accounts: { name: string; typeLabel: string }[]
}

/** Live holdings + quotes + names, derived exactly as the dashboard derives them. */
async function loadPortfolio(): Promise<LoadedPortfolio> {
  const allAccounts = await listViewerAccountsWithHoldings()
  const accounts = allAccounts.filter((account) => !account.hidden)
  const symbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )
  const assetClasses = assetClassMapFromAccounts(accounts)

  const [quotes, symbolInfo] = await Promise.all([
    getQuotes(symbols, { cacheOnly: true, assetClasses }),
    getSymbols(symbols, { fetchMissing: false, assetClasses }),
  ])

  const positions = derivePositions(accounts, quotes, symbolInfo)
  return {
    rows: consolidate(positions),
    total: portfolioTotal(positions),
    accounts: accounts.map((account) => ({
      name: account.name,
      typeLabel: ACCOUNT_TYPE_LABELS[account.accountType],
    })),
  }
}

/**
 * Pre-run cost quote (Req 18: show the estimated cost before the owner commits,
 * and warn when it would breach the monthly cap).
 */
export async function estimateRun(
  promptKey: string,
  tier: string,
  symbol: string,
): Promise<ActionResultWith<RunEstimate>> {
  if (!isPromptKey(promptKey)) return { ok: false, error: "Unknown analysis type." }
  if (!isModelTier(tier)) return { ok: false, error: "Unknown model tier." }

  const owner = await requireOwner()
  if (!owner.ok) return owner

  const prompt = await buildPrompt(promptKey, symbol)
  if (!prompt.ok) return prompt

  // Count tokens with the real tokenizer rather than a char heuristic — the
  // quote is a spend commitment, and dense numeric context tokenizes ~2x worse
  // than prose.
  const [budget, inputTokens] = await Promise.all([
    getBudget(),
    countPromptTokens(
      tier as ModelTier,
      prompt.data.systemPrompt,
      prompt.data.userMessage,
    ),
  ])
  const estimate = estimateCost(tier as ModelTier, inputTokens, prompt.data.maxTokens)

  return {
    ok: true,
    data: {
      ...estimate,
      budget,
      exceedsBudget: budget.spentUsd + estimate.maxCostUsd > budget.limitUsd,
    },
  }
}

/**
 * Runs an analysis. Demo viewers get the canned response and never reach the
 * API — no key, no spend, no authenticated read.
 */
export async function runAnalysisAction(
  promptKey: string,
  tier: string,
  symbol: string,
): Promise<ActionResultWith<Analysis>> {
  if (!isPromptKey(promptKey)) return { ok: false, error: "Unknown analysis type." }
  if (!isModelTier(tier)) return { ok: false, error: "Unknown model tier." }

  const viewer = await getViewer()
  if (viewer.mode === "demo" || !viewer.isOwner || !viewer.user) {
    return { ok: true, data: demoAnalysis(promptKey, symbol) }
  }

  const prompt = await buildPrompt(promptKey, symbol)
  if (!prompt.ok) return prompt

  const result = await callModel({
    userId: viewer.user.id,
    tier: tier as ModelTier,
    systemPrompt: prompt.data.systemPrompt,
    userMessage: prompt.data.userMessage,
    maxTokens: prompt.data.maxTokens,
  })
  if (!result.ok) return result

  const analysis = await recordAnalysis({
    userId: viewer.user.id,
    targetType: prompt.data.targetType,
    target: prompt.data.target,
    promptKey,
    model: result.data.modelId,
    content: result.data.text,
    inputTokens: result.data.inputTokens,
    outputTokens: result.data.outputTokens,
    costUsd: result.data.costUsd,
  })

  revalidatePath("/analysis")
  return { ok: true, data: { ...analysis, truncated: result.data.truncated } }
}

/** Remaining runs this hour and the month's spend — drives the header chips. */
export async function getUsageSnapshot(): Promise<
  ActionResultWith<{ runsRemaining: number; budget: Awaited<ReturnType<typeof getBudget>> }>
> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const [recentRuns, budget] = await Promise.all([
    countRecentRuns(owner.userId),
    getBudget(),
  ])
  return {
    ok: true,
    data: { runsRemaining: Math.max(0, RATE_LIMIT_PER_HOUR - recentRuns), budget },
  }
}

export async function savePromptAction(
  promptKey: string,
  systemPrompt: string,
  userTemplate: string,
): Promise<ActionResult> {
  if (!isPromptKey(promptKey)) return { ok: false, error: "Unknown analysis type." }

  const owner = await requireOwner()
  if (!owner.ok) return owner

  if (systemPrompt.trim().length === 0) {
    return {
      ok: false,
      error: "The system prompt can't be empty — it's what keeps the model on task.",
    }
  }
  if (!userTemplate.includes("{{context}}")) {
    return {
      ok: false,
      error:
        "The message template must include {{context}}, or the model gets no portfolio data to work from.",
    }
  }

  const result = await savePromptTemplate(promptKey, { systemPrompt, userTemplate })
  if (!result.ok) return result

  revalidatePath("/admin")
  revalidatePath("/analysis")
  return { ok: true }
}

export async function setBudgetLimitAction(limitUsd: number): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const result = await setBudgetLimit(limitUsd)
  if (!result.ok) return result

  revalidatePath("/admin")
  revalidatePath("/analysis")
  return { ok: true }
}
