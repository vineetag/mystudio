"use client"

import Link from "next/link"
import { useMemo } from "react"
import { consolidate, type PositionRow } from "@/modules/portfolio"
import { GAIN_TEXT, LOSS_TEXT } from "@/components/holdings-table/columns"
import { SymbolBadge } from "@/components/holdings-table/symbol-badge"
import { formatSignedPct, formatWholeMoney } from "@/lib/format"
import type { DashboardTab } from "./dashboard-tabs"

const TOP_COUNT = 5

/**
 * Overview snippet: the five largest consolidated holdings, with a real link
 * to the Investments tab so it still works without JS (full reload SSRs the
 * right tab).
 */
export function TopHoldings({
  positions,
  onSelectTab,
}: {
  positions: PositionRow[]
  onSelectTab: (tab: DashboardTab) => void
}) {
  const rows = useMemo(() => consolidate(positions), [positions])
  // consolidate() already sorts by value descending (unpriced last).
  const top = rows.slice(0, TOP_COUNT)
  if (top.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-medium text-ink">Top holdings</h2>
      <ul className="flex flex-col divide-y divide-rule/60 rounded-lg border border-rule bg-white/70 px-4">
        {top.map((row) => {
          const change = row.dayChangePct
          const tone =
            change === null || change === 0
              ? "text-ink/60"
              : change > 0
                ? GAIN_TEXT
                : LOSS_TEXT
          return (
            <li
              key={row.symbol}
              className="flex min-h-12 items-center justify-between gap-3 py-2.5"
            >
              <SymbolBadge
                symbol={row.symbol}
                companyName={row.companyName}
                logoDomain={row.logoDomain}
              />
              <span className="flex shrink-0 flex-col items-end leading-tight tabular-nums">
                <span className="font-medium">
                  {row.value === null ? "—" : formatWholeMoney(row.value)}
                </span>
                {change !== null && (
                  <span className={`text-xs ${tone}`}>{formatSignedPct(change)}</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {rows.length > TOP_COUNT && (
        <Link
          href="/?tab=investments"
          prefetch={false}
          onClick={(event) => {
            // pushState instead of router navigation — a real nav would
            // refetch the whole force-dynamic page.
            event.preventDefault()
            onSelectTab("investments")
          }}
          className="inline-flex min-h-12 items-center self-start text-sm font-medium text-moss hover:underline"
        >
          View all {rows.length} holdings →
        </Link>
      )}
    </section>
  )
}
