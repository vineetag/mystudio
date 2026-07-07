"use client"

import { useState, useTransition } from "react"
import { createAccount, updateAccount, type AccountInput } from "@/modules/accounts/actions"
import type { Account, AccountType } from "@/modules/accounts/types"
import { ACCOUNT_TYPE_OPTIONS } from "@/modules/accounts/labels"

/** Create form when `account` is absent, edit form when present. */
export function AccountForm({
  account,
  onDone,
}: {
  account?: Account
  onDone?: () => void
}) {
  const [name, setName] = useState(account?.name ?? "")
  const [broker, setBroker] = useState(account?.broker ?? "")
  const [accountType, setAccountType] = useState<AccountType>(
    account?.accountType ?? "taxable",
  )
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const input: AccountInput = { name, broker, accountType }
    startTransition(async () => {
      const result = account
        ? await updateAccount(account.id, input)
        : await createAccount(input)
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (!account) {
        setName("")
        setBroker("")
        setAccountType("taxable")
      }
      onDone?.()
    })
  }

  const inputClass =
    "min-h-12 rounded-md border border-neutral-300 px-3 text-base outline-none focus:border-neutral-500"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Fidelity 401k"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Broker
          <input
            required
            value={broker}
            onChange={(event) => setBroker(event.target.value)}
            placeholder="Fidelity"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Type
          <select
            value={accountType}
            onChange={(event) => setAccountType(event.target.value as AccountType)}
            className={inputClass}
          >
            {ACCOUNT_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-12 rounded-md bg-neutral-900 px-4 text-base font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : account ? "Save changes" : "Add account"}
        </button>
        {account && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="min-h-12 rounded-md border border-neutral-300 px-4 text-base"
          >
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  )
}
