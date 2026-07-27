"use client"

import type { BankAccount } from "@/modules/bank-accounts/types"
import { formatAsOf, formatMoney } from "@/lib/format"
import { StatCard, StatGrid } from "./stat-card"

function accountCountLabel(count: number): string {
  return `across ${count} ${count === 1 ? "account" : "accounts"}`
}

function newestSync(accounts: BankAccount[]): string | undefined {
  return accounts
    .map((account) => account.lastSyncedAt)
    .sort()
    .at(-1)
}

/** "12:42 PM" / "Jul 3, 12:42 PM" — formatAsOf without the prefix. */
function syncTime(iso: string): string {
  return formatAsOf(iso).replace(/^as of /, "")
}

/** Stat row for the Cash tab: totals over the visible cash accounts. */
export function CashStatsRow({ accounts }: { accounts: BankAccount[] }) {
  if (accounts.length === 0) return null

  const total = accounts.reduce((sum, account) => sum + account.balance, 0)
  const institutions = new Set(accounts.map((account) => account.institutionName))
  const largest = accounts.reduce((best, account) =>
    account.balance > best.balance ? account : best,
  )
  const lastSynced = newestSync(accounts)

  return (
    <StatGrid>
      <StatCard
        label="Total cash"
        value={formatMoney(total)}
        sub={accountCountLabel(accounts.length)}
      />
      <StatCard
        label="Institutions"
        value={String(institutions.size)}
        sub={institutions.size === 1 ? "bank" : "banks"}
      />
      <StatCard
        label="Largest account"
        value={formatMoney(largest.balance)}
        sub={largest.accountName}
      />
      {lastSynced && (
        <StatCard label="Last synced" value={syncTime(lastSynced)} sub="latest sync" />
      )}
    </StatGrid>
  )
}

/**
 * Stat row for the Liabilities tab. Balances follow the SimpleFIN sign
 * convention (negative = owed), so magnitudes go through Math.abs — same as
 * the net-worth math in live-dashboard.
 */
export function LiabilityStatsRow({ accounts }: { accounts: BankAccount[] }) {
  if (accounts.length === 0) return null

  const owedTotal = accounts.reduce(
    (sum, account) => sum + Math.abs(account.balance),
    0,
  )
  const cards = accounts.filter((account) => account.accountType === "credit_card")
  const loans = accounts.filter((account) => account.accountType === "loan")
  const cardsTotal = cards.reduce((sum, account) => sum + Math.abs(account.balance), 0)
  const loansTotal = loans.reduce((sum, account) => sum + Math.abs(account.balance), 0)
  const largest = accounts.reduce((best, account) =>
    Math.abs(account.balance) > Math.abs(best.balance) ? account : best,
  )

  return (
    <StatGrid>
      <StatCard
        label="Total owed"
        value={formatMoney(owedTotal)}
        sub={accountCountLabel(accounts.length)}
      />
      <StatCard
        label="Credit cards"
        value={formatMoney(cardsTotal)}
        sub={`${cards.length} ${cards.length === 1 ? "card" : "cards"}`}
      />
      <StatCard
        label="Loans"
        value={formatMoney(loansTotal)}
        sub={`${loans.length} ${loans.length === 1 ? "loan" : "loans"}`}
      />
      <StatCard
        label="Largest balance"
        value={formatMoney(Math.abs(largest.balance))}
        sub={largest.accountName}
      />
    </StatGrid>
  )
}
