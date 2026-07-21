"use client"

// Projected annual dividend income per holding — horizontal bars, largest
// first, each labeled with its dollar figure and the yield behind it.
//
// Deliberately NOT a calendar: we have yields but no ex-dividend or pay dates
// (Finnhub's dividend endpoint is premium-only), and spreading an annual figure
// across months would invent timing the data doesn't support. Every number here
// is value × yield, which is stated in the card's subtitle.

import type { IncomeBar } from "@/modules/analyzer"
import { formatMoney } from "@/lib/format"

// Single hue: these bars encode one magnitude, not eight identities.
const BAR_COLOR = "#1baf7a"

export function IncomeBars({ bars }: { bars: IncomeBar[] }) {
  const max = Math.max(...bars.map((bar) => bar.annualIncome))

  return (
    <ul className="flex flex-col gap-2.5">
      {bars.map((bar) => (
        <li key={bar.symbol} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium text-ink">{bar.symbol}</span>
              {bar.companyName && (
                <span className="ml-2 text-ink/50">{bar.companyName}</span>
              )}
            </span>
            <span className="shrink-0 tabular-nums text-ink">
              {formatMoney(bar.annualIncome)}
              <span className="ml-2 text-ink/50">{bar.dividendYield.toFixed(2)}%</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-rule/60">
            <div
              className="h-full rounded-full"
              style={{
                // Widths are relative to the largest bar so small payers stay
                // visible; the dollar label carries the absolute figure.
                width: `${max > 0 ? (bar.annualIncome / max) * 100 : 0}%`,
                backgroundColor: BAR_COLOR,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
