"use client"

import { useState, useTransition } from "react"
import { setBudgetLimitAction } from "@/modules/ai/actions"
import type { Budget } from "@/modules/ai/types"

export function BudgetForm({ budget }: { budget: Budget }) {
  const [limit, setLimit] = useState(budget.limitUsd.toFixed(2))
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const pctUsed =
    budget.limitUsd > 0 ? Math.min(100, (budget.spentUsd / budget.limitUsd) * 100) : 100

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSaved(false)
    startTransition(async () => {
      const result = await setBudgetLimitAction(Number(limit))
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
    })
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">AI spend cap</h2>
        <span className="text-xs tabular-nums text-ink/60">
          {budget.month}: ${budget.spentUsd.toFixed(4)} of $
          {budget.limitUsd.toFixed(2)}
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-ink/10"
        role="img"
        aria-label={`${pctUsed.toFixed(0)}% of this month's AI budget used`}
      >
        <div
          className={`h-full rounded-full ${pctUsed >= 90 ? "bg-amber-500" : "bg-moss"}`}
          style={{ width: `${pctUsed}%` }}
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-ink">Monthly cap (USD)</span>
          <input
            required
            inputMode="decimal"
            value={limit}
            onChange={(event) => {
              setLimit(event.target.value)
              setSaved(false)
            }}
            className="min-h-12 w-full rounded-md border border-rule px-3 text-base tabular-nums outline-none focus:border-moss"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-12 rounded-md bg-ink px-5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save cap"}
        </button>
      </form>

      <p className="text-xs text-ink/60">
        Runs are refused before they start when their worst-case cost would push the
        month past this cap. It carries forward to next month.
      </p>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-sm text-moss">Cap updated.</p> : null}
    </section>
  )
}
