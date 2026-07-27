"use client"

import Link from "next/link"
import { formatWholeMoney } from "@/lib/format"
import type { DashboardTab } from "./dashboard-tabs"

/**
 * Overview snippet: one tappable row per bank side (cash / owed), linking to
 * its tab. Real hrefs keep the links working without JS.
 */
export function BankingSummary({
  cashTotal,
  cashCount,
  owedTotal,
  owedCount,
  onSelectTab,
}: {
  cashTotal: number
  cashCount: number
  owedTotal: number
  owedCount: number
  onSelectTab: (tab: DashboardTab) => void
}) {
  if (cashCount === 0 && owedCount === 0) return null

  const rows: {
    tab: DashboardTab
    label: string
    amount: string
    count: number
  }[] = [
    {
      tab: "cash",
      label: "Cash",
      amount: formatWholeMoney(cashTotal),
      count: cashCount,
    },
    {
      tab: "liabilities",
      label: "Owed",
      amount: `−${formatWholeMoney(owedTotal)}`,
      count: owedCount,
    },
  ]

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-medium text-ink">Banking</h2>
      <div className="flex flex-col divide-y divide-rule/60 rounded-lg border border-rule bg-white/70 px-4">
        {rows
          .filter((row) => row.count > 0)
          .map((row) => (
            <Link
              key={row.tab}
              href={`/?tab=${row.tab}`}
              prefetch={false}
              onClick={(event) => {
                // pushState instead of router navigation — a real nav would
                // refetch the whole force-dynamic page.
                event.preventDefault()
                onSelectTab(row.tab)
              }}
              className="flex min-h-12 items-center justify-between gap-3 py-1 hover:text-moss"
            >
              <span className="text-sm font-medium">
                {row.label}
                <span className="ml-2 font-normal text-ink/50">
                  {row.count} {row.count === 1 ? "account" : "accounts"}
                </span>
              </span>
              <span className="tabular-nums font-medium">{row.amount} →</span>
            </Link>
          ))}
      </div>
    </section>
  )
}
