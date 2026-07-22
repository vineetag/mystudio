"use client"

import { useState, useTransition } from "react"
// Server actions and leaf types only — server-only query/sync code stays
// behind the module index (same convention as modules/accounts).
import { setBankAccountType } from "@/modules/bank-accounts/actions"
import {
  isLiabilityType,
  type BankAccount,
  type BankAccountType,
} from "@/modules/bank-accounts/types"
import { formatAsOf, formatMoney } from "@/lib/format"

const TYPE_LABELS: Record<BankAccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit card",
  loan: "Loan",
  unknown: "Unknown",
}

function groupByInstitution(accounts: BankAccount[]): [string, BankAccount[]][] {
  const groups = new Map<string, BankAccount[]>()
  for (const account of accounts) {
    const list = groups.get(account.institutionName) ?? []
    list.push(account)
    groups.set(account.institutionName, list)
  }
  return [...groups.entries()]
}

/**
 * The type badge is the owner's correction point for the checking/savings
 * guess made at first sync — a select styled as a badge, persisted via a
 * server action. Read-only text for demo viewers (who never get rows anyway).
 */
function TypeBadge({
  account,
  canManage,
}: {
  account: BankAccount
  canManage: boolean
}) {
  const [type, setType] = useState(account.accountType)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!canManage) {
    return (
      <span className="rounded-full border border-rule px-2.5 py-0.5 text-xs text-ink/60">
        {TYPE_LABELS[type]}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col">
      <select
        value={type}
        disabled={isPending}
        aria-label={`Account type for ${account.accountName}`}
        // Visually a badge, but with a 48px-tall touch target via padding.
        className="min-h-12 cursor-pointer appearance-none rounded-full border border-rule bg-transparent px-3 text-xs text-ink/70 disabled:opacity-50"
        onChange={(event) => {
          const next = event.target.value as BankAccountType
          const previous = type
          setType(next)
          setError(null)
          startTransition(async () => {
            const result = await setBankAccountType(account.id, next)
            if (!result.ok) {
              setType(previous)
              setError(result.error)
            }
          })
        }}
      >
        {(Object.keys(TYPE_LABELS) as BankAccountType[]).map((value) => (
          <option key={value} value={value}>
            {TYPE_LABELS[value]}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 text-xs text-red-700">{error}</span>}
    </span>
  )
}

function AccountGroups({
  accounts,
  canManage,
  isLiability,
}: {
  accounts: BankAccount[]
  canManage: boolean
  isLiability: boolean
}) {
  return (
    <div className="flex flex-col gap-5">
      {groupByInstitution(accounts).map(([institution, group]) => (
        <div key={institution} className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
            {institution}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-2 rounded-lg border border-rule bg-white/70 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">{account.accountName}</p>
                  <TypeBadge account={account} canManage={canManage} />
                </div>
                <p className="font-display text-2xl font-medium tabular-nums text-ink">
                  {/* Liabilities show what's owed as a plain positive number —
                      SimpleFIN's sign convention (negative = owed) is an
                      implementation detail the ledger shouldn't surface. */}
                  {isLiability
                    ? formatMoney(Math.abs(account.balance))
                    : formatMoney(account.balance)}
                  {account.currency !== "USD" && (
                    <span className="ml-1 text-sm text-ink/50">{account.currency}</span>
                  )}
                  {isLiability && (
                    <span className="ml-1.5 text-sm font-normal text-ink/50">owed</span>
                  )}
                </p>
                <p className="text-sm text-ink/60">
                  {account.balanceDate
                    ? formatAsOf(account.balanceDate)
                    : `synced ${formatAsOf(account.lastSyncedAt).replace("as of ", "")}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CashAccounts({
  accounts,
  canManage,
}: {
  accounts: BankAccount[]
  canManage: boolean
}) {
  const cash = accounts.filter((account) => !isLiabilityType(account.accountType))
  const liabilities = accounts.filter((account) =>
    isLiabilityType(account.accountType),
  )
  if (accounts.length === 0) return null

  return (
    <>
      {cash.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-medium text-ink">Cash accounts</h2>
          <AccountGroups accounts={cash} canManage={canManage} isLiability={false} />
        </section>
      )}
      {liabilities.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-medium text-ink">Liabilities</h2>
          <AccountGroups
            accounts={liabilities}
            canManage={canManage}
            isLiability={true}
          />
        </section>
      )}
    </>
  )
}
