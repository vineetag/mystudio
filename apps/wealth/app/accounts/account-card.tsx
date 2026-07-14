"use client"

import { useState, useTransition } from "react"
import { deleteAccount } from "@/modules/accounts/actions"
import type { AccountWithHoldings } from "@/modules/accounts"
import type { SymbolInfo } from "@/modules/symbols/types"
import { AccountForm } from "./account-form"
import { AddHoldingForm } from "./add-holding-form"
import { AccountHeader, type AccountTotal } from "./account-header"
import { HoldingRow } from "./holding-row"

/**
 * One collapsible account: the header toggles the panel; the panel holds the
 * management UI — edit/delete account, holdings table, add-holding form.
 */
export function AccountCard({
  account,
  symbols,
  total,
  open,
  onToggle,
}: {
  account: AccountWithHoldings
  symbols: Record<string, SymbolInfo>
  total: AccountTotal
  open: boolean
  onToggle: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const panelId = `account-panel-${account.id}`

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setError("")
    startTransition(async () => {
      const result = await deleteAccount(account.id)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border ${
        open ? "border-ink/25 shadow-sm" : "border-rule"
      }`}
    >
      <AccountHeader
        account={account}
        total={total}
        open={open}
        onToggle={onToggle}
        panelId={panelId}
      />

      {open && (
        <div id={panelId} className="border-t border-rule px-3 pb-4 sm:px-4">
          {isEditing ? (
            <div className="mt-3">
              <AccountForm account={account} onDone={() => setIsEditing(false)} />
            </div>
          ) : (
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="min-h-12 rounded-md border border-rule px-3 text-sm"
              >
                Edit account
              </button>
              <button
                onClick={handleDelete}
                onBlur={() => setConfirmingDelete(false)}
                disabled={isPending}
                className={`min-h-12 rounded-md border px-3 text-sm ${
                  confirmingDelete
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-rule"
                }`}
              >
                {confirmingDelete
                  ? `Confirm — deletes ${account.holdings.length} holding${account.holdings.length === 1 ? "" : "s"}`
                  : "Delete"}
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            {account.holdings.length === 0 ? (
              <p className="rounded-md border border-dashed border-rule p-4 text-sm text-ink/70">
                No holdings yet — add the first one below or use CSV import.
              </p>
            ) : (
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink/60">
                    <th className="py-2 pr-3 font-medium">Symbol</th>
                    <th className="py-2 pr-3 text-right font-medium">Quantity</th>
                    <th className="py-2 pr-3 text-right font-medium">Avg cost</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {account.holdings.map((holding) => (
                    <HoldingRow
                      key={holding.id}
                      holding={holding}
                      symbolInfo={symbols[holding.symbol] ?? null}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4">
            <AddHoldingForm accountId={account.id} />
          </div>
        </div>
      )}
    </div>
  )
}
