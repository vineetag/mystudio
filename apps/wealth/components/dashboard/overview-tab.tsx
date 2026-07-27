"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { MARKET_INDICES } from "@/modules/quotes/indices"
import type { QuoteView } from "@/modules/quotes/types"
import type { ChangeChip } from "@/modules/snapshots/types"
import type { Snapshot } from "@/modules/snapshots/types"
import type { PositionRow } from "@/modules/portfolio"
import { GAIN_TEXT, LOSS_TEXT } from "@/components/holdings-table/columns"
import { PortfolioChart } from "@/components/portfolio-chart"
import {
  formatIndexPoints,
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
} from "@/lib/format"
import { BankingSummary } from "./banking-summary"
import { EmptyPortfolio } from "./empty-portfolio"
import { TopHoldings } from "./top-holdings"
import type { DashboardTab } from "./dashboard-tabs"

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

/**
 * The default panel: period changes, indices, a compact performance chart,
 * and summaries that link into the deeper tabs.
 */
export function OverviewTab({
  hasAccounts,
  isOwner,
  hiddenAccountCount,
  chips,
  projectedAnnualIncome,
  quotes,
  snapshots,
  positions,
  cashTotal,
  cashCount,
  owedTotal,
  owedCount,
  onSelectTab,
}: {
  hasAccounts: boolean
  isOwner: boolean
  hiddenAccountCount: number
  chips: ChangeChip[]
  projectedAnnualIncome: number
  quotes: Map<string, QuoteView>
  snapshots: Snapshot[]
  positions: PositionRow[]
  cashTotal: number
  cashCount: number
  owedTotal: number
  owedCount: number
  onSelectTab: (tab: DashboardTab) => void
}) {
  return (
    <>
      {hasAccounts && (chips.length > 0 || projectedAnnualIncome > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {chips.map((chip) => (
            <ChangeCard key={chip.label} chip={chip} />
          ))}
          {projectedAnnualIncome > 0 && (
            <DividendsCard amount={projectedAnnualIncome} />
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
      {hasAccounts ? (
        <>
          {isOwner && <PortfolioChart snapshots={snapshots} compact />}
          <TopHoldings positions={positions} onSelectTab={onSelectTab} />
        </>
      ) : (
        <EmptyPortfolio isOwner={isOwner} hiddenAccountCount={hiddenAccountCount} />
      )}
      <BankingSummary
        cashTotal={cashTotal}
        cashCount={cashCount}
        owedTotal={owedTotal}
        owedCount={owedCount}
        onSelectTab={onSelectTab}
      />
    </>
  )
}
