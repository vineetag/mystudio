"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { ArrowUpRight, Eye, EyeOff } from "lucide-react"
import { deleteAccount, setAccountHidden } from "@/modules/accounts/actions"
import type { AccountWithHoldings } from "@/modules/accounts"
import { AccountForm } from "./account-form"
import { AccountHeader, type AccountTotal } from "./account-header"

/**
 * One collapsible account: the header toggles the panel; the panel holds
 * account-level management (edit/delete) and links to the dashboard's
 * "By account" view, which owns all holding-level viewing and editing.
 */
export function AccountCard({
  account,
  total,
  open,
  onToggle,
}: {
  account: AccountWithHoldings
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

  function handleToggleHidden() {
    setError("")
    startTransition(async () => {
      const result = await setAccountHidden(account.id, !account.hidden)
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
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {account.hidden ? (
                <p className="flex min-h-12 items-center text-sm text-ink/60">
                  Hidden — excluded from the dashboard and portfolio total.
                </p>
              ) : (
                <Link
                  href={`/?account=${account.id}`}
                  className="flex min-h-12 items-center gap-1 text-sm font-medium text-moss underline-offset-2 hover:underline"
                >
                  View &amp; manage holdings on the dashboard
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="min-h-12 rounded-md border border-rule px-3 text-sm"
                >
                  Edit account
                </button>
                <button
                  onClick={handleToggleHidden}
                  disabled={isPending}
                  title={
                    account.hidden
                      ? "Include this account in the dashboard and portfolio total again"
                      : "Exclude this account from the dashboard and portfolio total"
                  }
                  className="flex min-h-12 items-center gap-1.5 rounded-md border border-rule px-3 text-sm"
                >
                  {account.hidden ? (
                    <Eye className="h-4 w-4" aria-hidden />
                  ) : (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  )}
                  {account.hidden ? "Unhide" : "Hide"}
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
            </div>
          )}

          {error && (
            <p role="alert" className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
