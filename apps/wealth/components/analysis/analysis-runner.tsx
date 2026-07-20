"use client"

import { useEffect, useState, useTransition } from "react"
import { estimateRun, runAnalysisAction } from "@/modules/ai/actions"
import { MODELS, MODEL_TIERS, DEFAULT_TIER, type ModelTier } from "@/modules/ai/pricing"
import type { Analysis, Budget, PromptKey, RunEstimate } from "@/modules/ai/types"
import { AnalysisMarkdown } from "./analysis-markdown"

interface PromptOption {
  key: PromptKey
  label: string
  description: string
}

interface Props {
  prompts: PromptOption[]
  isOwner: boolean
  budget: Budget | null
  runsRemaining: number | null
  /** Symbols the owner holds — powers the datalist on the stock picker. */
  heldSymbols: string[]
}

const inputClass =
  "min-h-12 w-full rounded-md border border-rule px-3 text-base outline-none focus:border-moss"

function usd(value: number): string {
  // Sub-cent runs are the normal case on the Fast tier — 4 dp, not 2.
  return `$${value.toFixed(4)}`
}

export function AnalysisRunner({
  prompts,
  isOwner,
  budget,
  runsRemaining,
  heldSymbols,
}: Props) {
  const [promptKey, setPromptKey] = useState<PromptKey>(prompts[0]?.key ?? "portfolio")
  const [tier, setTier] = useState<ModelTier>(DEFAULT_TIER)
  const [symbol, setSymbol] = useState("")
  const [estimate, setEstimate] = useState<RunEstimate | null>(null)
  const [estimateError, setEstimateError] = useState("")
  const [result, setResult] = useState<Analysis | null>(null)
  const [error, setError] = useState("")
  const [isRunning, startRun] = useTransition()

  const needsSymbol = promptKey === "stock" || promptKey === "research"
  const canQuote = isOwner && (!needsSymbol || symbol.trim().length > 0)

  // Re-quote whenever the inputs change. Debounced so typing a ticker doesn't
  // fire a request per keystroke — each quote rebuilds the full prompt server-side.
  useEffect(() => {
    if (!canQuote) {
      setEstimate(null)
      setEstimateError("")
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      const quote = await estimateRun(promptKey, tier, symbol)
      if (cancelled) return
      if (quote.ok) {
        setEstimate(quote.data)
        setEstimateError("")
      } else {
        setEstimate(null)
        setEstimateError(quote.error)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [promptKey, tier, symbol, canQuote])

  function handleRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    startRun(async () => {
      const run = await runAnalysisAction(promptKey, tier, symbol)
      if (!run.ok) {
        setError(run.error)
        return
      }
      setResult(run.data)
    })
  }

  const outOfRuns = runsRemaining !== null && runsRemaining <= 0
  const blocked = estimate?.exceedsBudget || outOfRuns

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleRun}
        className="flex flex-col gap-4 rounded-lg border border-rule p-4"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">Analysis</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {prompts.map((prompt) => (
              <label
                key={prompt.key}
                className={`flex min-h-12 cursor-pointer flex-col justify-center rounded-md border p-3 text-sm ${
                  promptKey === prompt.key
                    ? "border-moss bg-moss/5 text-ink"
                    : "border-rule text-ink/70 hover:border-ink/30"
                }`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="prompt"
                    value={prompt.key}
                    checked={promptKey === prompt.key}
                    onChange={() => {
                      setPromptKey(prompt.key)
                      setResult(null)
                    }}
                    className="accent-moss"
                  />
                  {prompt.label}
                </span>
                <span className="mt-1 text-xs text-ink/60">{prompt.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {needsSymbol ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Symbol</span>
            <input
              required
              value={symbol}
              onChange={(event) => setSymbol(event.target.value.toUpperCase())}
              placeholder={promptKey === "stock" ? "A ticker you hold" : "Any ticker"}
              list={promptKey === "stock" ? "held-symbols" : undefined}
              className={inputClass}
            />
            {promptKey === "stock" ? (
              <datalist id="held-symbols">
                {heldSymbols.map((held) => (
                  <option key={held} value={held} />
                ))}
              </datalist>
            ) : null}
          </label>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">Model</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODEL_TIERS.map((option) => (
              <label
                key={option}
                className={`flex min-h-12 cursor-pointer flex-col justify-center rounded-md border p-3 text-sm ${
                  tier === option
                    ? "border-moss bg-moss/5 text-ink"
                    : "border-rule text-ink/70 hover:border-ink/30"
                }`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="tier"
                    value={option}
                    checked={tier === option}
                    onChange={() => setTier(option)}
                    className="accent-moss"
                  />
                  {MODELS[option].label}
                </span>
                <span className="mt-1 text-xs text-ink/60">{MODELS[option].blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {isOwner ? (
          <div
            className={`rounded-md border p-3 text-sm ${
              estimate?.exceedsBudget
                ? "border-amber-500 bg-amber-50 text-amber-950"
                : "border-rule text-ink/70"
            }`}
            aria-live="polite"
          >
            {estimateError ? (
              <span className="text-red-700">{estimateError}</span>
            ) : estimate ? (
              <>
                <span className="font-medium text-ink">
                  Up to {usd(estimate.maxCostUsd)}
                </span>{" "}
                for this run ({estimate.inputTokens.toLocaleString()} input tokens,{" "}
                {estimate.maxOutputTokens.toLocaleString()} max output ·{" "}
                {estimate.modelId}).
                {estimate.exceedsBudget ? (
                  <span className="mt-1 block font-medium">
                    This would exceed the {estimate.budget.month} cap of{" "}
                    ${estimate.budget.limitUsd.toFixed(2)} —{" "}
                    {usd(estimate.budget.remainingUsd)} left. Raise the cap in Admin or
                    pick a cheaper model.
                  </span>
                ) : null}
              </>
            ) : (
              <span>
                {needsSymbol && symbol.trim().length === 0
                  ? "Enter a symbol to see the estimated cost."
                  : "Estimating cost…"}
              </span>
            )}
          </div>
        ) : (
          <p className="rounded-md border border-rule p-3 text-sm text-ink/70">
            Demo mode returns a canned example. No API call is made and nothing is
            charged.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isRunning || blocked}
            className="min-h-12 rounded-md bg-ink px-5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isRunning ? "Analyzing…" : "Run analysis"}
          </button>
          {budget ? (
            <span className="text-xs text-ink/60">
              {budget.month}: {usd(budget.spentUsd)} of ${budget.limitUsd.toFixed(2)}{" "}
              spent
              {runsRemaining !== null ? ` · ${runsRemaining} runs left this hour` : ""}
            </span>
          ) : null}
        </div>

        {outOfRuns ? (
          <p className="text-sm text-amber-800">
            You&rsquo;ve hit the hourly run limit. It resets on a rolling hour.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {isRunning ? <AnalysisSkeleton /> : null}

      {result && !isRunning ? (
        <article className="flex flex-col gap-4 rounded-lg border border-rule p-5">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-3">
            <h2 className="text-xl font-semibold text-ink">
              {result.targetType === "portfolio" ? "Whole portfolio" : result.target}
            </h2>
            <span className="text-xs text-ink/60">
              {result.isDemo
                ? "Canned demo response · no API call"
                : `${result.model} · ${result.inputTokens.toLocaleString()} in / ${result.outputTokens.toLocaleString()} out · ${usd(result.costUsd)}`}
            </span>
          </header>
          {result.truncated ? (
            <p className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950">
              This answer was cut off — the model reached its output budget. It&rsquo;s
              still valid up to this point, but the closing section is missing.
            </p>
          ) : null}
          <AnalysisMarkdown content={result.content} />
          <p className="border-t border-rule pt-3 text-xs text-ink/50">
            Generated by an AI model. Not financial advice — verify anything you act on.
          </p>
        </article>
      ) : null}
    </div>
  )
}

/** CSS-only skeleton so the result area never collapses to a blank screen. */
function AnalysisSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-rule p-5" aria-hidden>
      <div className="h-6 w-1/3 animate-pulse rounded bg-ink/10" />
      <div className="h-4 w-full animate-pulse rounded bg-ink/10" />
      <div className="h-4 w-11/12 animate-pulse rounded bg-ink/10" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-ink/10" />
      <div className="mt-2 h-5 w-1/4 animate-pulse rounded bg-ink/10" />
      <div className="h-4 w-10/12 animate-pulse rounded bg-ink/10" />
      <div className="h-4 w-9/12 animate-pulse rounded bg-ink/10" />
    </div>
  )
}
