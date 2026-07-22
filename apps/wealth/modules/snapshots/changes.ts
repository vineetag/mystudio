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

/**
 * An account whose value moves more than this between two snapshots is
 * treated as a cash flow (deposit, transfer-in, first full holdings sync),
 * not a market return, and sits out that day-pair. Real single-day account
 * moves stay well under ±50% — even a concentrated crypto account — while
 * onboarding artifacts (value 0 → $375k when a 401(k) finally prices) are
 * orders of magnitude past it.
 */
const MAX_DAILY_ACCOUNT_RETURN = 0.5

/**
 * Flow-adjusted performance index (base 100) for the portfolio series.
 *
 * Indexing raw totals charts deposits as returns: connecting a new brokerage
 * mid-range shows up as a +38% "day". Instead, chain day-over-day returns
 * computed only from the accounts that are present and priced (> 0) in BOTH
 * consecutive snapshots — the same-store comparison used for time-weighted
 * returns when flow amounts aren't recorded. Accounts that appear, vanish,
 * price from 0, or move past MAX_DAILY_ACCOUNT_RETURN sit out that day-pair
 * and rejoin the chain the next day. A pair with no usable overlap carries
 * the index flat rather than fabricating a move.
 */
export function flowAdjustedIndex(
  snapshots: Pick<Snapshot, "totalValue" | "perAccount">[],
): (number | null)[] {
  const index: (number | null)[] = []
  let level: number | null = null

  for (let i = 0; i < snapshots.length; i++) {
    if (level === null) {
      // Chain starts at the first snapshot with any positive value.
      level = snapshots[i].totalValue > 0 ? 100 : null
      index.push(level)
      continue
    }

    const prev = new Map(
      snapshots[i - 1].perAccount.map((account) => [account.accountId, account.value]),
    )
    let prevSum = 0
    let currSum = 0
    for (const account of snapshots[i].perAccount) {
      const prevValue = prev.get(account.accountId)
      if (prevValue === undefined || prevValue <= 0 || account.value <= 0) continue
      const dayReturn = account.value / prevValue - 1
      if (Math.abs(dayReturn) > MAX_DAILY_ACCOUNT_RETURN) continue
      prevSum += prevValue
      currSum += account.value
    }

    if (prevSum > 0) level = level * (currSum / prevSum)
    index.push(level)
  }
  return index
}
