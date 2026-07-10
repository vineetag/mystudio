"use client"

import { useState, useTransition } from "react"
import { deleteHolding, updateHolding } from "@/modules/holdings/actions"
import type { Holding } from "@/modules/holdings/types"
import { setSymbolName } from "@/modules/symbols/actions"
import type { SymbolInfo } from "@/modules/symbols/types"
import { SymbolBadge } from "@/components/holdings-table/symbol-badge"

const numberInputClass =
  "min-h-12 w-full rounded-md border border-rule px-2 text-right text-base tabular-nums outline-none focus:border-moss"

/** Inline editor for a symbol's official/manual name (persisted in pt_symbols). */
function SymbolNameEditor({
  symbol,
  initialName,
}: {
  symbol: string
  initialName: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName ?? "")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError("")
    startTransition(async () => {
      const result = await setSymbolName(symbol, name)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(initialName ?? "")
          setEditing(true)
        }}
        className="mt-1 text-xs text-moss underline-offset-2 hover:underline"
      >
        {initialName ? "Edit name" : "+ Add name"}
      </button>
    )
  }

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={80}
        placeholder="Company or fund name"
        aria-label={`Name for ${symbol}`}
        className="min-h-11 w-48 rounded-md border border-rule px-2 text-sm outline-none focus:border-moss"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="min-h-11 rounded-md border border-rule px-3 text-xs"
        >
          {isPending ? "Saving…" : "Save name"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false)
            setError("")
          }}
          className="min-h-11 rounded-md border border-rule px-3 text-xs"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-loss">
          {error}
        </p>
      )}
    </div>
  )
}

export function HoldingRow({
  holding,
  symbolInfo,
}: {
  holding: Holding
  symbolInfo: SymbolInfo | null
}) {
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

  const buttonClass = "min-h-12 rounded-md border border-rule px-3 text-sm"

  return (
    <>
      <tr className="border-t border-rule">
        <td className="py-2 pr-3 align-top">
          <SymbolBadge
            symbol={holding.symbol}
            companyName={symbolInfo?.name ?? null}
            logoDomain={symbolInfo?.domain ?? null}
            size={26}
          />
          <SymbolNameEditor symbol={holding.symbol} initialName={symbolInfo?.name ?? null} />
        </td>
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
