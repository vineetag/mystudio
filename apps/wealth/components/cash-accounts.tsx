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
import { BrokerLogo } from "@/components/broker-logo"

const TYPE_LABELS: Record<BankAccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit card",
  loan: "Loan",
  unknown: "Unknown",
}

// Tinted pill per account type — cash types read calm (blue/green), liability
// types read warm (amber/rose) so the distinction registers at a glance.
const TYPE_PILL_STYLES: Record<BankAccountType, string> = {
  checking: "border-sky-200 bg-sky-50 text-sky-900",
  savings: "border-emerald-200 bg-emerald-50 text-emerald-900",
  credit_card: "border-amber-200 bg-amber-50 text-amber-900",
  loan: "border-rose-200 bg-rose-50 text-rose-900",
  unknown: "border-rule bg-ink/5 text-ink/60",
}

const TYPE_DOT_STYLES: Record<BankAccountType, string> = {
  checking: "bg-sky-500",
  savings: "bg-emerald-500",
  credit_card: "bg-amber-500",
  loan: "bg-rose-500",
  unknown: "bg-ink/30",
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
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TYPE_PILL_STYLES[type]}`}
      >
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${TYPE_DOT_STYLES[type]}`}
        />
        {TYPE_LABELS[type]}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col">
      <span
        className={`relative inline-flex items-center rounded-full border ${TYPE_PILL_STYLES[type]} ${isPending ? "opacity-50" : ""}`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute left-2.5 size-1.5 rounded-full ${TYPE_DOT_STYLES[type]}`}
        />
        <select
          value={type}
          disabled={isPending}
          aria-label={`Account type for ${account.accountName}`}
          // Visually a badge, but with a 48px-tall touch target via padding.
          // Left padding clears the dot; right padding clears the chevron.
          className="min-h-12 cursor-pointer appearance-none bg-transparent pl-6 pr-6 text-xs font-medium text-inherit"
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
        {/* appearance-none removes the native arrow — restore an affordance. */}
        <svg
          aria-hidden
          viewBox="0 0 8 5"
          className="pointer-events-none absolute right-2.5 h-[5px] w-2 fill-current opacity-60"
        >
          <path d="M0 0h8L4 5z" />
        </svg>
      </span>
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
          <div className="flex items-center gap-2">
            {/* Same official-only logo pipeline as brokerages; unknown banks
                fall through to a clean initials tile. */}
            <BrokerLogo broker={institution} size={22} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
              {institution}
            </p>
          </div>
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
