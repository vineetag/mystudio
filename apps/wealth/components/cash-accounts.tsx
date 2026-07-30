"use client"

import { useState, useTransition } from "react"
// Server actions and leaf types only — server-only query/sync code stays
// behind the module index (same convention as modules/accounts).
import {
  setBankAccountType,
  syncBankAccountsNow,
} from "@/modules/bank-accounts/actions"
import type {
  BankAccount,
  BankAccountType,
  BankSyncHealth,
} from "@/modules/bank-accounts/types"
import { describeBalanceAge, formatMoney, formatSyncedAt } from "@/lib/format"
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
        className={`inline-flex self-start items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TYPE_PILL_STYLES[type]}`}
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
    <span className="inline-flex flex-col self-start">
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

/**
 * Owner-only escape hatch from the 6-hour background-sync TTL — newly linked
 * SimpleFIN connections show up on click instead of hours later. The server
 * action enforces a cooldown; its refusal message surfaces here verbatim.
 */
export function SyncNowButton() {
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "done"; message: string }
    | { kind: "warning"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" })
  const [isPending, startTransition] = useTransition()

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        className="inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-full border border-rule bg-white/70 px-4 text-xs font-medium text-ink/70 transition-opacity hover:text-ink disabled:cursor-default disabled:opacity-50"
        onClick={() => {
          setStatus({ kind: "idle" })
          startTransition(async () => {
            const result = await syncBankAccountsNow()
            if (!result.ok) {
              setStatus({ kind: "error", message: result.error })
              return
            }
            const { inserted, updated, relinked, merged, disconnected, simplefinErrors } =
              result.data
            // Name every outcome the sync can have — a reconnected bank being
            // matched back to its existing card, or an account dropping off,
            // is exactly the kind of change that looks like a bug unsaid.
            const parts = [
              `Balances refreshed (${updated + relinked} account${
                updated + relinked === 1 ? "" : "s"
              }).`,
            ]
            if (inserted > 0) {
              parts.push(`Added ${inserted} new account${inserted === 1 ? "" : "s"}.`)
            }
            if (relinked + merged > 0) {
              const reconnected = relinked + merged
              parts.push(
                `Matched ${reconnected} reconnected account${
                  reconnected === 1 ? "" : "s"
                } to its existing card.`,
              )
            }
            if (disconnected > 0) {
              parts.push(
                `${disconnected} account${
                  disconnected === 1 ? " is" : "s are"
                } no longer in your connection — reload for details.`,
              )
            }
            const summary = parts.join(" ")
            // A sync can succeed while SimpleFIN still warns that a
            // connection is stale — say so instead of a bare success.
            if (simplefinErrors.length > 0) {
              setStatus({
                kind: "warning",
                message: `${summary} ${simplefinErrors.length} connection${
                  simplefinErrors.length === 1 ? "" : "s"
                } need attention — reload to see details.`,
              })
              return
            }
            setStatus({ kind: "done", message: summary })
          })
        }}
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`size-3.5 fill-none stroke-current stroke-[1.5] ${isPending ? "animate-spin" : ""}`}
        >
          <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v2.6h-2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isPending ? "Syncing…" : "Sync now"}
      </button>
      {status.kind === "done" && (
        <span className="text-xs text-emerald-700">{status.message}</span>
      )}
      {status.kind === "warning" && (
        <span className="text-xs text-amber-700">{status.message}</span>
      )}
      {status.kind === "error" && (
        <span className="text-xs text-red-700">{status.message}</span>
      )}
    </span>
  )
}

/** Where a broken SimpleFIN connection is actually re-authorized. */
const SIMPLEFIN_BRIDGE_URL = "https://beta-bridge.simplefin.org/"

/**
 * Warnings from the last sync, shown on page load rather than only in the
 * response to a manual sync. A connection that needs re-auth keeps serving
 * cached balances — nothing throws and the sync reports success — so without
 * this the account just quietly stops moving. SimpleFIN's strings already
 * name the institution and read plainly, so they're passed through verbatim.
 */
function SyncHealthBanner({ health }: { health: BankSyncHealth }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3"
    >
      <p className="text-sm font-medium text-amber-900">
        {health.errors.length === 1
          ? "One bank connection needs attention"
          : `${health.errors.length} bank connections need attention`}
      </p>
      <ul className="flex flex-col gap-1">
        {health.errors.map((message) => (
          <li key={message} className="text-sm text-amber-900/80">
            {message}
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-900/70">
        Balances for these accounts are still shown, but they stopped updating
        at the date on the card.{" "}
        <a
          href={SIMPLEFIN_BRIDGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2"
        >
          Reconnect in SimpleFIN Bridge
        </a>
        , then use Sync now.
      </p>
    </div>
  )
}

function BalanceTimestamp({ account }: { account: BankAccount }) {
  const { label, isStale } = describeBalanceAge(
    account.balanceDate,
    account.lastSyncedAt,
  )

  return (
    <p className="text-sm text-ink/60">
      {formatSyncedAt(account.lastSyncedAt)}
      {label && (
        <>
          {" · "}
          <span className={isStale ? "text-amber-700" : undefined}>{label}</span>
        </>
      )}
    </p>
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
                {/* The type leads as a category eyebrow rather than sitting
                    beside the name. Sharing a justify-between row with the
                    name made its position depend on name length — right-
                    aligned for "360 Checking", wrapped below for "Costco
                    Anywhere Visa® Card by Citi-2610" — which read as a
                    layout bug on narrow screens. Its own line is identical
                    at every breakpoint and leaves the name full width. */}
                <TypeBadge account={account} canManage={canManage} />
                <p className="font-medium text-ink">{account.accountName}</p>
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
                {/* Our sync time leads because it is the same across every
                    account and is what "Sync now" actually moves. The bank's
                    own balance-date only appears when it lags a full day
                    behind, so a stale balance is never passed off as current. */}
                <BalanceTimestamp account={account} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * One bank section (cash or liabilities), now a full dashboard tab panel.
 * Each tab carries its own SyncNowButton — the two are never on screen at
 * the same time, so independent status messages are fine.
 */
export function BankSection({
  title,
  accounts,
  canManage,
  isLiability,
  simpleFinConfigured,
  syncHealth,
}: {
  title: string
  accounts: BankAccount[]
  canManage: boolean
  isLiability: boolean
  simpleFinConfigured: boolean
  syncHealth?: BankSyncHealth | null
}) {
  const showSync = canManage && simpleFinConfigured
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-medium text-ink">{title}</h2>
        {showSync && <SyncNowButton />}
      </div>
      {/* Owner-only: the fix (re-auth on the Bridge) is only theirs to make,
          and the warnings name institutions a shared viewer needn't see.
          Shown on both tabs — a bad connection can hold either a deposit
          account or a card. */}
      {canManage && syncHealth && <SyncHealthBanner health={syncHealth} />}
      {accounts.length === 0 ? (
        <BankEmptyState
          isLiability={isLiability}
          canManage={canManage}
          simpleFinConfigured={simpleFinConfigured}
        />
      ) : (
        <AccountGroups
          accounts={accounts}
          canManage={canManage}
          isLiability={isLiability}
        />
      )}
    </section>
  )
}

function BankEmptyState({
  isLiability,
  canManage,
  simpleFinConfigured,
}: {
  isLiability: boolean
  canManage: boolean
  simpleFinConfigured: boolean
}) {
  let message: string
  if (isLiability) {
    message = "No liabilities — nothing owed."
  } else if (!canManage) {
    message = "No linked bank accounts."
  } else if (!simpleFinConfigured) {
    message =
      "Connect SimpleFIN to see cash balances here — set SIMPLEFIN_ACCESS_URL in the environment to enable syncing."
  } else {
    message = "No cash accounts synced yet — use Sync now to pull balances."
  }
  return (
    <div className="rounded-lg border border-dashed border-rule p-8 text-center text-sm text-ink/70">
      {message}
    </div>
  )
}
