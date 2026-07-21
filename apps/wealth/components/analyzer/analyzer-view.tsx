"use client"

// Client shell for /analyzer. Same data path as the dashboard: SSR hands over
// whatever the quote cache had, then this polls /api/quotes so the charts land
// on live prices seconds later instead of blocking first paint on Finnhub.

import { useEffect, useMemo, useState } from "react"
import {
  allocationByAssetClass,
  allocationBySector,
  foldSlices,
  incomeBreakdown,
  positionSizes,
  tickerAccountBars,
} from "@/modules/analyzer"
import {
  consolidate,
  derivePositions,
  type DeriveAccountInput,
} from "@/modules/portfolio"
import { mergeQuoteViews, QUOTE_POLL_MS } from "@/modules/quotes/cache"
import type { QuoteView } from "@/modules/quotes/types"
import type { SymbolInfo } from "@/modules/symbols/types"
import { AllocationDonut } from "@/components/analyzer/allocation-donut"
import { ChartCard, ChartEmpty, symbolList } from "@/components/analyzer/chart-card"
import { IncomeBars } from "@/components/analyzer/income-bars"
import { PositionTreemap } from "@/components/analyzer/position-treemap"
import { TickerAccountBars } from "@/components/analyzer/ticker-account-bars"
import { formatMoney } from "@/lib/format"

// The categorical palette is eight fixed hues — the tail folds into "Other".
const MAX_SLICES = 8

type DonutMode = "sector" | "assetClass"

export function AnalyzerView({
  accounts,
  initialQuotes,
  symbols,
}: {
  accounts: DeriveAccountInput[]
  initialQuotes: Record<string, QuoteView>
  symbols: Record<string, SymbolInfo>
}) {
  const [quotes, setQuotes] = useState(() => new Map(Object.entries(initialQuotes)))
  const [donutMode, setDonutMode] = useState<DonutMode>("sector")

  const symbolMap = useMemo(() => new Map(Object.entries(symbols)), [symbols])

  const holdingSymbolsKey = useMemo(() => {
    const unique = new Set<string>()
    for (const account of accounts) {
      for (const holding of account.holdings) unique.add(holding.symbol)
    }
    return [...unique].sort().join(",")
  }, [accounts])

  useEffect(() => {
    if (holdingSymbolsKey.length === 0) return
    let cancelled = false

    async function pollQuotes() {
      if (document.hidden) return
      const params = new URLSearchParams({ symbols: holdingSymbolsKey, refresh: "1" })
      try {
        const response = await fetch(`/api/quotes?${params.toString()}`, {
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as { quotes: Record<string, QuoteView> }
        if (!cancelled) setQuotes((current) => mergeQuoteViews(current, payload.quotes))
      } catch {
        // Keep showing the last good prices on transient network errors.
      }
    }

    void pollQuotes()
    const intervalId = window.setInterval(() => void pollQuotes(), QUOTE_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [holdingSymbolsKey])

  const rows = useMemo(
    () => consolidate(derivePositions(accounts, quotes, symbolMap)),
    [accounts, quotes, symbolMap],
  )

  const sectorAllocation = useMemo(
    () => foldSlices(allocationBySector(rows), MAX_SLICES),
    [rows],
  )
  const assetClassAllocation = useMemo(() => allocationByAssetClass(rows), [rows])
  const sizes = useMemo(() => positionSizes(rows), [rows])
  const accountBars = useMemo(() => tickerAccountBars(rows), [rows])
  const income = useMemo(() => incomeBreakdown(rows), [rows])

  const allocation = donutMode === "sector" ? sectorAllocation : assetClassAllocation

  return (
    <div className="flex flex-col gap-6">
      <ChartCard
        title="Allocation"
        subtitle={
          donutMode === "sector"
            ? "Market value by industry sector. Funds and other symbols the data provider can't classify share one bucket."
            : "Market value by asset class, as recorded on each holding."
        }
        footnote={
          allocation.excludedSymbols.length > 0
            ? `Not charted (no price available): ${symbolList(allocation.excludedSymbols)}`
            : undefined
        }
      >
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["sector", "By sector"],
              ["assetClass", "By asset class"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDonutMode(mode)}
              aria-pressed={donutMode === mode}
              className={`flex min-h-12 items-center rounded-md border px-4 text-sm transition-colors ${
                donutMode === mode
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-ink/70 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {allocation.slices.length === 0 ? (
          <ChartEmpty message="No priced holdings yet — add a holding, or wait for the next quote refresh." />
        ) : (
          <AllocationDonut allocation={allocation} />
        )}
      </ChartCard>

      <ChartCard
        title="Position sizes"
        subtitle={`Every position sized by market value. Charted total ${formatMoney(sizes.total)}.`}
        footnote={
          sizes.excludedSymbols.length > 0
            ? `Not charted (no price available): ${symbolList(sizes.excludedSymbols)}`
            : undefined
        }
      >
        {sizes.items.length === 0 ? (
          <ChartEmpty message="No priced holdings yet — add a holding, or wait for the next quote refresh." />
        ) : (
          <PositionTreemap items={sizes.items} />
        )}
      </ChartCard>

      <ChartCard
        title="Where each ticker sits"
        subtitle="For tickers held in more than one account, how their value splits across those accounts."
      >
        {accountBars.length === 0 ? (
          <ChartEmpty message="No ticker is held in two or more accounts yet — nothing to split." />
        ) : (
          <TickerAccountBars bars={accountBars} />
        )}
      </ChartCard>

      <ChartCard
        title="Projected dividend income"
        subtitle={`Value × current yield over the next 12 months — ${formatMoney(income.total)} across ${income.bars.length} holding${income.bars.length === 1 ? "" : "s"}. Not a payment schedule: ex-dividend and pay dates aren't available on our data plan.`}
        footnote={
          income.unknownYieldSymbols.length > 0
            ? `No yield data (may or may not pay a dividend): ${symbolList(income.unknownYieldSymbols)}`
            : undefined
        }
      >
        {income.bars.length === 0 ? (
          <ChartEmpty message="None of your holdings report a dividend yield." />
        ) : (
          <IncomeBars bars={income.bars} />
        )}
      </ChartCard>
    </div>
  )
}
