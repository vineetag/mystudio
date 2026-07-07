"use client"

import { useState, useTransition } from "react"
import { deleteHolding, updateHolding } from "@/modules/holdings/actions"
import type { Holding } from "@/modules/holdings/types"

const numberInputClass =
  "min-h-12 w-full rounded-md border border-neutral-300 px-2 text-right text-base tabular-nums outline-none focus:border-neutral-500"

export function HoldingRow({ holding }: { holding: Holding }) {
  const [isEditing, setIsEditing] = useState(false)
  const [quantity, setQuantity] = useState(String(holding.quantity))
  const [avgCost, setAvgCost] = useState(
    holding.avgCost === null ? "" : String(holding.avgCost),
  )
  const [error, setError] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError("")
    startTransition(async () => {
      const result = await updateHolding(holding.id, {
        quantity: Number(quantity),
        avgCost: avgCost.trim() === "" ? null : Number(avgCost),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setIsEditing(false)
    })
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setError("")
    startTransition(async () => {
      const result = await deleteHolding(holding.id)
      if (!result.ok) setError(result.error)
    })
  }

  const buttonClass = "min-h-12 rounded-md border border-neutral-300 px-3 text-sm"

  return (
    <>
      <tr className="border-t border-neutral-200">
        <td className="py-2 pr-3 font-medium">{holding.symbol}</td>
        <td className="py-2 pr-3 text-right tabular-nums">
          {isEditing ? (
            <input
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={numberInputClass}
              aria-label={`Quantity for ${holding.symbol}`}
            />
          ) : (
            holding.quantity.toLocaleString()
          )}
        </td>
        <td className="py-2 pr-3 text-right tabular-nums">
          {isEditing ? (
            <input
              inputMode="decimal"
              value={avgCost}
              onChange={(event) => setAvgCost(event.target.value)}
              placeholder="no cost basis"
              className={numberInputClass}
              aria-label={`Average cost for ${holding.symbol}`}
            />
          ) : holding.avgCost === null ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              no cost basis
            </span>
          ) : (
            holding.avgCost.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })
          )}
        </td>
        <td className="py-2 text-right">
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <button onClick={handleSave} disabled={isPending} className={buttonClass}>
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setQuantity(String(holding.quantity))
                    setAvgCost(holding.avgCost === null ? "" : String(holding.avgCost))
                    setError("")
                  }}
                  className={buttonClass}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className={buttonClass}>
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  onBlur={() => setConfirmingDelete(false)}
                  disabled={isPending}
                  className={`${buttonClass} ${confirmingDelete ? "border-red-300 bg-red-50 text-red-800" : ""}`}
                >
                  {confirmingDelete ? "Confirm delete" : "Delete"}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={4}>
            <p role="alert" className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
              {error}
            </p>
          </td>
        </tr>
      )}
    </>
  )
}
