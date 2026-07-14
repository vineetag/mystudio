"use client"

import { useState, useTransition } from "react"
import { deleteHolding, updateHolding } from "@/modules/holdings/actions"
import { setSymbolName } from "@/modules/symbols/actions"
import type { PositionRow } from "@/modules/portfolio"

const inputClass =
  "min-h-12 w-full rounded-md border border-rule px-3 text-base outline-none focus:border-moss"

/**
 * Inline editor for one holding, shown under its dashboard row. Edits
 * quantity, avg cost, and the symbol's display name (for funds Finnhub
 * can't resolve); deletes with a two-tap confirm. Server actions
 * revalidate the dashboard, so a save lands in the table on completion.
 */
export function HoldingEditor({
  position,
  onClose,
}: {
  position: PositionRow
  onClose: () => void
}) {
  const [quantity, setQuantity] = useState(String(position.quantity))
  const [avgCost, setAvgCost] = useState(
    position.avgCost === null ? "" : String(position.avgCost),
  )
  const [name, setName] = useState(position.companyName ?? "")
  const [error, setError] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError("")
    startTransition(async () => {
      const result = await updateHolding(position.holdingId, {
        quantity: Number(quantity),
        avgCost: avgCost.trim() === "" ? null : Number(avgCost),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const trimmedName = name.trim()
      if (trimmedName !== (position.companyName ?? "") && trimmedName !== "") {
        const nameResult = await setSymbolName(position.symbol, trimmedName)
        if (!nameResult.ok) {
          setError(nameResult.error)
          return
        }
      }
      onClose()
    })
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setError("")
    startTransition(async () => {
      const result = await deleteHolding(position.holdingId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onClose()
    })
  }

  const buttonClass = "min-h-12 rounded-md border border-rule px-3 text-sm"

  return (
    <div className="flex flex-col gap-3 rounded-md bg-ink/[0.03] p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-ink/60">
          Quantity
          <input
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-label={`Quantity for ${position.symbol}`}
            className={`${inputClass} text-right tabular-nums`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink/60">
          Avg cost
          <input
            inputMode="decimal"
            value={avgCost}
            onChange={(event) => setAvgCost(event.target.value)}
            placeholder="empty = no cost basis"
            aria-label={`Average cost for ${position.symbol}`}
            className={`${inputClass} text-right tabular-nums`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink/60">
          Display name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Company or fund name"
            aria-label={`Name for ${position.symbol}`}
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleSave} disabled={isPending} className={buttonClass}>
          {isPending ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} className={buttonClass}>
          Cancel
        </button>
        <button
          onClick={handleDelete}
          onBlur={() => setConfirmingDelete(false)}
          disabled={isPending}
          className={`${buttonClass} ml-auto ${
            confirmingDelete ? "border-red-300 bg-red-50 text-red-800" : ""
          }`}
        >
          {confirmingDelete ? "Confirm delete" : "Delete"}
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}
