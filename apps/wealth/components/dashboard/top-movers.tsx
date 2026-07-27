"use client"

import { useMemo } from "react"
import { consolidate, type ConsolidatedRow, type PositionRow } from "@/modules/portfolio"
import { GAIN_TEXT, LOSS_TEXT } from "@/components/holdings-table/columns"
import { formatSignedMoney, formatSignedPct } from "@/lib/format"
import { StatCard } from "./stat-card"

/** Day-change dollars recovered from value and day-change percent. */
function dayChangeDollars(row: ConsolidatedRow): number | null {
  if (row.value === null || row.dayChangePct === null) return null
  const divisor = 100 + row.dayChangePct
  if (divisor === 0) return null
  return (row.value * row.dayChangePct) / divisor
}

function MoverCard({ label, row }: { label: string; row: ConsolidatedRow }) {
  const pct = row.dayChangePct ?? 0
  const tone = pct === 0 ? "text-ink/70" : pct > 0 ? GAIN_TEXT : LOSS_TEXT
  const dollars = dayChangeDollars(row)
  return (
    <StatCard
      label={label}
      value={row.symbol}
      sub={
        <span className={tone}>
          {formatSignedPct(pct)}
          {dollars !== null && ` · ${formatSignedMoney(dollars)}`}
        </span>
      }
    />
  )
}

/**
 * Today's best and worst consolidated holdings, as two cards for the
 * Investments stat row. Hidden until at least two holdings have a priced
 * day change.
 */
export function TopMoverCards({ positions }: { positions: PositionRow[] }) {
  const movers = useMemo(() => {
    const priced = consolidate(positions).filter(
      (row) => row.dayChangePct !== null && row.value !== null,
    )
    if (priced.length < 2) return null
    const sorted = [...priced].sort(
      (a, b) => (b.dayChangePct as number) - (a.dayChangePct as number),
    )
    return { gainer: sorted[0], loser: sorted[sorted.length - 1] }
  }, [positions])

  if (!movers) return null
  return (
    <>
      <MoverCard label="Top gainer" row={movers.gainer} />
      <MoverCard label="Top loser" row={movers.loser} />
    </>
  )
}
