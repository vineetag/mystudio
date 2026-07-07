"use client"

import { useState, useTransition } from "react"
import { addHolding } from "@/modules/holdings/actions"

export function AddHoldingForm({ accountId }: { accountId: string }) {
  const [symbol, setSymbol] = useState("")
  const [quantity, setQuantity] = useState("")
  const [avgCost, setAvgCost] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    startTransition(async () => {
      const result = await addHolding(accountId, {
        symbol,
        quantity: Number(quantity),
        avgCost: avgCost.trim() === "" ? null : Number(avgCost),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSymbol("")
      setQuantity("")
      setAvgCost("")
    })
  }

  const inputClass =
    "min-h-12 rounded-md border border-neutral-300 px-3 text-base outline-none focus:border-neutral-500"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          required
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
          placeholder="Symbol (GOOG)"
          aria-label="Symbol"
          className={inputClass}
        />
        <input
          required
          inputMode="decimal"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="Quantity"
          aria-label="Quantity"
          className={`${inputClass} text-right tabular-nums`}
        />
        <input
          inputMode="decimal"
          value={avgCost}
          onChange={(event) => setAvgCost(event.target.value)}
          placeholder="Avg cost (empty = none)"
          aria-label="Average cost"
          className={`${inputClass} text-right tabular-nums`}
        />
        <button
          type="submit"
          disabled={isPending}
          className="min-h-12 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add holding"}
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  )
}
