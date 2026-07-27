"use client"

import { formatAsOf, formatWholeMoney } from "@/lib/format"

/**
 * The always-visible headline inside the sticky region: net worth, the
 * investments/cash/owed breakdown, the asset-split bar, and the as-of line
 * qualifying the number. The eyebrow (account counts) lives outside the
 * sticky region in LiveDashboard so it scrolls away.
 */
export function NetWorthHero({
  netWorth,
  investmentsTotal,
  cashTotal,
  owedTotal,
  hasBankAccounts,
  newestQuote,
  unpricedSymbols,
}: {
  netWorth: number
  investmentsTotal: number
  cashTotal: number
  owedTotal: number
  hasBankAccounts: boolean
  newestQuote: string | undefined
  unpricedSymbols: string[]
}) {
  const assetTotal = investmentsTotal + cashTotal
  return (
    <div>
      <p className="ledger-sum inline-block pb-1 pr-8 font-display text-4xl font-medium tabular-nums tracking-tight sm:text-5xl">
        {formatWholeMoney(netWorth)}
      </p>
      {hasBankAccounts && (
        <div className="mt-2 flex flex-col gap-1.5">
          <p className="text-sm tabular-nums text-ink/70">
            Investments {formatWholeMoney(investmentsTotal)} · Cash{" "}
            {formatWholeMoney(cashTotal)}
            {owedTotal > 0 && <> · Owed −{formatWholeMoney(owedTotal)}</>}
          </p>
          {assetTotal > 0 && (
            // Investments vs cash split across assets (liabilities are a
            // subtraction, not a slice) — same CVD-safe palette as the
            // portfolio chart (green portfolio line, blue benchmark).
            <div
              className="flex h-1.5 w-full max-w-md overflow-hidden rounded-full"
              role="img"
              aria-label={`Asset split: ${Math.round((investmentsTotal / assetTotal) * 100)}% investments, ${Math.round((cashTotal / assetTotal) * 100)}% cash`}
            >
              <div
                className="h-full"
                style={{
                  width: `${(investmentsTotal / assetTotal) * 100}%`,
                  backgroundColor: "#008300",
                }}
              />
              <div
                className="h-full"
                style={{
                  width: `${(cashTotal / assetTotal) * 100}%`,
                  backgroundColor: "#2a78d6",
                }}
              />
            </div>
          )}
        </div>
      )}
      <p className="mt-2 truncate text-xs text-ink/60 sm:text-sm">
        {newestQuote ? formatAsOf(newestQuote) : "no prices yet"}
        <span className="text-ink/40"> · refreshes every minute</span>
        {unpricedSymbols.length > 0 && (
          <span className="text-amber-700">
            {" "}
            · excludes {unpricedSymbols.join(", ")} — price unavailable
          </span>
        )}
      </p>
    </div>
  )
}
