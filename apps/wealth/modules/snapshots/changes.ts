// Pure period-over-period math — no I/O, unit-tested.

import type { ChangeChip, Snapshot } from "./types"

const PERIODS = [
  { label: "D/D", days: 1 },
  { label: "W/W", days: 7 },
  { label: "M/M", days: 30 },
] as const

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Compute D/D, W/W, M/M chips for the current portfolio value against
 * history. The baseline for an N-day period is the newest snapshot dated on
 * or before (today − N days) — weekends and gaps fall back to the nearest
 * earlier day. A period with no baseline yet is simply omitted (nothing
 * fabricated); `baselineDate` says what was actually compared against.
 */
export function computeChangeChips(
  currentValue: number,
  history: Pick<Snapshot, "snapshotDate" | "totalValue">[],
  today: string,
): ChangeChip[] {
  const sorted = [...history]
    .filter((row) => row.snapshotDate < today)
    .sort((a, b) => (a.snapshotDate < b.snapshotDate ? -1 : 1))

  const chips: ChangeChip[] = []
  for (const period of PERIODS) {
    const target = addDays(today, -period.days)
    let baseline: (typeof sorted)[number] | undefined
    for (const row of sorted) {
      if (row.snapshotDate <= target) baseline = row
      else break
    }
    if (!baseline || baseline.totalValue <= 0) continue

    const abs = currentValue - baseline.totalValue
    chips.push({
      label: period.label,
      abs,
      pct: (abs / baseline.totalValue) * 100,
      baselineDate: baseline.snapshotDate,
    })
  }
  return chips
}

/**
 * Index a series to 100 at its first non-null value — shared by the
 * portfolio/benchmark comparison chart.
 */
export function indexTo100(values: (number | null)[]): (number | null)[] {
  const base = values.find((value) => value !== null && value > 0)
  if (base === undefined || base === null) return values.map(() => null)
  return values.map((value) => (value === null ? null : (value / base) * 100))
}
