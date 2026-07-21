"use client"

// Per-ticker account split — one 100% stacked bar per ticker, segments sized by
// how much of that ticker sits in each account. Only tickers held in two or
// more accounts appear (a one-segment bar says nothing).
//
// Color follows the account, not the segment's rank inside a bar, so "the 401k
// slice" is the same hue on every row. Segments are direct-labeled with the
// account name wherever they're wide enough, and the legend lists all of them.

import { useMemo, useState } from "react"
import { OTHER, type TickerAccountBar } from "@/modules/analyzer"
import { seriesColor } from "@/components/analyzer/palette"
import { formatMoney } from "@/lib/format"

const MAX_ACCOUNT_HUES = 8

export function TickerAccountBars({ bars }: { bars: TickerAccountBar[] }) {
  const [active, setActive] = useState<string | null>(null)

  // A stable account → hue slot map, ordered by total value across all bars, so
  // the biggest accounts take the first (most separable) slots. Past the eight
  // palette slots, the tail shares the neutral "Other" color rather than
  // inventing hues.
  const accountColors = useMemo(() => {
    const totals = new Map<string, { name: string; value: number }>()
    for (const bar of bars) {
      for (const segment of bar.segments) {
        const entry = totals.get(segment.accountId)
        if (entry) entry.value += segment.value
        else totals.set(segment.accountId, { name: segment.accountName, value: segment.value })
      }
    }

    const ranked = [...totals.entries()].sort(
      (a, b) => b[1].value - a[1].value || a[1].name.localeCompare(b[1].name),
    )
    return new Map(
      ranked.map(([accountId], index) => [
        accountId,
        index < MAX_ACCOUNT_HUES ? seriesColor(index) : seriesColor(index, OTHER),
      ]),
    )
  }, [bars])

  const legend = useMemo(() => {
    const seen = new Map<string, string>()
    for (const bar of bars) {
      for (const segment of bar.segments) {
        if (!seen.has(segment.accountId)) seen.set(segment.accountId, segment.accountName)
      }
    }
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]))
  }, [bars])

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {bars.map((bar) => (
          <li key={bar.symbol} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-ink">{bar.symbol}</span>
              <span className="shrink-0 tabular-nums text-ink/60">
                {formatMoney(bar.total)}
              </span>
            </div>

            <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded">
              {bar.segments.map((segment) => {
                const key = `${bar.symbol}:${segment.accountId}`
                const dim = active !== null && active !== segment.accountId
                return (
                  <div
                    key={key}
                    // overflow-hidden, not just truncate: a label wider than
                    // its own segment would otherwise spill over the neighbour.
                    className="flex min-w-0 items-center justify-center overflow-hidden px-1"
                    style={{
                      width: `${segment.pct}%`,
                      backgroundColor: accountColors.get(segment.accountId),
                      opacity: dim ? 0.4 : 1,
                    }}
                    title={`${segment.accountName} — ${formatMoney(segment.value)} (${segment.pct.toFixed(1)}%)`}
                    onMouseEnter={() => setActive(segment.accountId)}
                    onMouseLeave={() => setActive(null)}
                  >
                    {/* Direct label only when the segment can hold it. */}
                    {segment.pct >= 18 && (
                      <span className="truncate text-[11px] font-medium text-white">
                        {segment.accountName} {segment.pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {legend.map(([accountId, name]) => (
          <li
            key={accountId}
            className="flex min-h-8 items-center gap-2 text-sm text-ink/70"
            onMouseEnter={() => setActive(accountId)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: accountColors.get(accountId) }}
            />
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}
