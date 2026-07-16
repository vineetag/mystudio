"use client"

import Link from "next/link"
import { ArrowDown, ArrowUp } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { AccountType } from "@/modules/accounts/types"
import {
  derivePositions,
  portfolioTotal,
  type DeriveAccountInput,
} from "@/modules/portfolio"
import { mergeQuoteViews, QUOTE_POLL_MS } from "@/modules/quotes/cache"
import { MARKET_INDICES } from "@/modules/quotes/indices"
import type { QuoteView } from "@/modules/quotes/types"
import type { SymbolInfo } from "@/modules/symbols/types"
import { computeChangeChips } from "@/modules/snapshots/changes"
import type { ChangeChip, Snapshot } from "@/modules/snapshots/types"
import { DashboardTables, type AccountSection } from "@/components/holdings-table/dashboard-tables"
import { PortfolioChart } from "@/components/portfolio-chart"
import { GAIN_TEXT, LOSS_TEXT } from "@/components/holdings-table/columns"
import {
  formatAsOf,
  formatIndexPoints,
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
} from "@/lib/format"

export type DashboardAccount = DeriveAccountInput & {
  broker: string
  brokerLogoUrl: string | null
  accountType: AccountType
}

function quotesFromRecord(record: Record<string, QuoteView>): Map<string, QuoteView> {
  return new Map(Object.entries(record))
}

function IndexFigure({
  label,
  quote,
}: {
  label: string
  quote: QuoteView | undefined
}) {
  const change = quote?.dayChangePct ?? null
  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap tabular-nums">
      <span className="text-sm text-ink/60">{label}</span>
      {!quote || quote.price === null ? (
        <span className="text-sm text-ink/40">unavailable</span>
      ) : (
        <>
          <span className="text-sm font-medium">{formatIndexPoints(quote.price)}</span>
          {change !== null && (
            <span
              className={`inline-flex items-center text-sm ${change === 0 ? "text-ink/60" : change > 0 ? GAIN_TEXT : LOSS_TEXT}`}
            >
              {change !== 0 &&
                (change > 0 ? (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                ))}
              {formatSignedPct(change)}
            </span>
          )}
          {quote.isStale && <span className="text-xs text-amber-700">stale</span>}
        </>
      )}
    </div>
  )
}

// Card labels for the period-over-period chips computed in modules/snapshots.
const CHIP_LABELS: Record<string, string> = {
  "D/D": "Today",
  "W/W": "1 week",
  "M/M": "1 month",
}

function ChangeCard({ chip }: { chip: ChangeChip }) {
  const tone = chip.abs === 0 ? "text-ink/70" : chip.abs > 0 ? GAIN_TEXT : LOSS_TEXT
  return (
    <div className="rounded-lg border border-rule bg-white/70 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
        {CHIP_LABELS[chip.label] ?? chip.label}
      </p>
      <p className={`mt-1 inline-flex items-center gap-1 font-medium tabular-nums ${tone}`}>
        {chip.abs !== 0 &&
          (chip.abs > 0 ? (
            <ArrowUp className="h-4 w-4" aria-hidden />
          ) : (
            <ArrowDown className="h-4 w-4" aria-hidden />
          ))}
        {formatSignedPct(chip.pct)}
      </p>
      <p className={`text-sm tabular-nums ${tone}`}>{formatSignedMoney(chip.abs)}</p>
    </div>
  )
}

function DividendsCard({ amount }: { amount: number }) {
  return (
    <div className="rounded-lg border border-rule bg-white/70 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Dividends</p>
      <p className="mt-1 font-medium tabular-nums text-ink">{formatMoney(amount)}/yr</p>
      <p className="text-sm text-ink/60">projected</p>
    </div>
  )
}

export function LiveDashboard({
  accounts,
  initialQuotes,
  symbols,
  isOwner,
  accountCount,
  hiddenAccountCount = 0,
  accountTypeLabels,
  snapshots,
  initialAccountId = null,
}: {
  accounts: DashboardAccount[]
  initialQuotes: Record<string, QuoteView>
  symbols: Record<string, SymbolInfo>
  isOwner: boolean
  accountCount: number
  /** Accounts hidden on /accounts — excluded from every figure here. */
  hiddenAccountCount?: number
  accountTypeLabels: Record<AccountType, string>
  snapshots: Snapshot[]
  /** Deep link from /accounts — opens "By account" with this section expanded. */
  initialAccountId?: string | null
}) {
  const [quotes, setQuotes] = useState(() => quotesFromRecord(initialQuotes))
  // Names + logo domains are static across the quote poll — build the map once.
  const symbolMap = useMemo(() => new Map(Object.entries(symbols)), [symbols])

  const holdingSymbols = useMemo(() => {
    const unique = new Set<string>()
    for (const account of accounts) {
      for (const holding of account.holdings) {
        unique.add(holding.symbol)
      }
    }
    return [...unique].sort()
  }, [accounts])

  const holdingSymbolsKey = holdingSymbols.join(",")
  const indexSymbolsKey = MARKET_INDICES.map((index) => index.symbol).join(",")

  useEffect(() => {
    let cancelled = false

    async function pollQuotes(symbolsParam: string) {
      const params = new URLSearchParams({ symbols: symbolsParam, refresh: "1" })
      try {
        const response = await fetch(`/api/quotes?${params.toString()}`, {
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as { quotes: Record<string, QuoteView> }
        if (!cancelled) {
          setQuotes((current) => mergeQuoteViews(current, payload.quotes))
        }
      } catch {
        // Keep showing the last good prices on transient network errors.
      }
    }

    function refreshQuotes() {
      if (document.hidden) return
      // Two separate requests: indices refresh via Yahoo in under a second,
      // while the holdings batch waits out the rate-paced Finnhub queue —
      // one combined request would pin the index figures to the slow batch.
      void pollQuotes(indexSymbolsKey)
      if (holdingSymbolsKey.length > 0) void pollQuotes(holdingSymbolsKey)
    }

    refreshQuotes()
    const intervalId = window.setInterval(refreshQuotes, QUOTE_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [indexSymbolsKey, holdingSymbolsKey])

  const positions = useMemo(
    () => derivePositions(accounts, quotes, symbolMap),
    [accounts, quotes, symbolMap],
  )
  const total = useMemo(() => portfolioTotal(positions), [positions])

  const chips = useMemo(() => {
    if (!isOwner) return []
    return computeChangeChips(
      total.value,
      snapshots,
      new Date().toISOString().slice(0, 10),
    )
  }, [isOwner, total.value, snapshots])

  const newestQuote = positions
    .map((position) => position.fetchedAt)
    .filter((fetchedAt): fetchedAt is string => fetchedAt !== null)
    .sort()
    .at(-1)

  const accountSections: AccountSection[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    broker: account.broker,
    brokerLogoUrl: account.brokerLogoUrl,
    typeLabel: accountTypeLabels[account.accountType],
  }))

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8">
      <section className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
            One view of {accountCount} {accountCount === 1 ? "account" : "accounts"} ·{" "}
            {positions.length} positions
            {hiddenAccountCount > 0 && (
              <span className="normal-case tracking-normal text-ink/40">
                {" "}
                · {hiddenAccountCount} hidden
              </span>
            )}
          </p>
          <p className="ledger-sum mt-2 inline-block pb-1 pr-8 font-display text-5xl font-medium tabular-nums tracking-tight">
            {formatMoney(total.value)}
          </p>
          <p className="mt-2 text-sm text-ink/60">
            {newestQuote ? formatAsOf(newestQuote) : "no prices yet"}
            <span className="text-ink/40"> · refreshes every minute</span>
            {total.unpricedSymbols.length > 0 && (
              <span className="text-amber-700">
                {" "}
                · excludes {total.unpricedSymbols.join(", ")} — price unavailable
              </span>
            )}
          </p>
        </div>
        {(chips.length > 0 || total.projectedAnnualIncome > 0) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {chips.map((chip) => (
              <ChangeCard key={chip.label} chip={chip} />
            ))}
            {total.projectedAnnualIncome > 0 && (
              <DividendsCard amount={total.projectedAnnualIncome} />
            )}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1.5 border-t border-rule pt-3">
          {MARKET_INDICES.map((index) => (
            <IndexFigure
              key={index.symbol}
              label={index.label}
              quote={quotes.get(index.symbol)}
            />
          ))}
        </div>
      </section>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-rule p-10 text-center">
          <h2 className="font-display text-xl font-medium text-ink">
            {!isOwner
              ? "Demo portfolio is empty"
              : hiddenAccountCount > 0
                ? "All accounts are hidden"
                : "Open the ledger"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
            {!isOwner ? (
              "The demo data hasn't been seeded yet — check back soon."
            ) : hiddenAccountCount > 0 ? (
              <>
                Every account is currently hidden, so nothing counts toward the
                total. Unhide accounts to bring them back.
              </>
            ) : (
              <>
                Add your first brokerage account, then enter holdings by hand or import a CSV.
              </>
            )}
          </p>
          {isOwner && (
            <Link
              href="/accounts"
              className="mt-4 inline-flex min-h-12 items-center rounded-md bg-ink px-5 text-sm font-medium text-paper"
            >
              {hiddenAccountCount > 0 ? "Manage accounts" : "Add first account"}
            </Link>
          )}
        </div>
      ) : (
        <>
          <DashboardTables
            positions={positions}
            accounts={accountSections}
            canManage={isOwner}
            initialAccountId={initialAccountId}
          />
          {isOwner && <PortfolioChart snapshots={snapshots} />}
        </>
      )}
    </main>
  )
}
