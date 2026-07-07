"use client"

import { useState, useTransition } from "react"
import { deleteAccount } from "@/modules/accounts/actions"
import type { AccountWithHoldings } from "@/modules/accounts"
import { AccountForm } from "./account-form"
import { AddHoldingForm } from "./add-holding-form"
import { ACCOUNT_TYPE_LABELS } from "./account-type-labels"
import { HoldingRow } from "./holding-row"

export function AccountCard({ account }: { account: AccountWithHoldings }) {
  const [isEditing, setIsEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

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
    <section className="rounded-lg border border-neutral-200 p-4">
      {isEditing ? (
        <AccountForm account={account} onDone={() => setIsEditing(false)} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{account.name}</h2>
            <p className="text-sm text-neutral-600">
              {account.broker} · {ACCOUNT_TYPE_LABELS[account.accountType]}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="min-h-12 rounded-md border border-neutral-300 px-3 text-sm"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              onBlur={() => setConfirmingDelete(false)}
              disabled={isPending}
              className={`min-h-12 rounded-md border px-3 text-sm ${
                confirmingDelete
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-neutral-300"
              }`}
            >
              {confirmingDelete
                ? `Confirm — deletes ${account.holdings.length} holding${account.holdings.length === 1 ? "" : "s"}`
                : "Delete"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        {account.holdings.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            No holdings yet — add the first one below or use CSV import.
          </p>
        ) : (
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3 font-medium">Symbol</th>
                <th className="py-2 pr-3 text-right font-medium">Quantity</th>
                <th className="py-2 pr-3 text-right font-medium">Avg cost</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {account.holdings.map((holding) => (
                <HoldingRow key={holding.id} holding={holding} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4">
        <AddHoldingForm accountId={account.id} />
      </div>
    </section>
  )
}
