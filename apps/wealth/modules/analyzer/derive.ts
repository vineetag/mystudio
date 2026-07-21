// Pure derivation for the visual analyzer: consolidated rows → chart-ready
// buckets. No I/O, no formatting, no layout — unit-tested.
//
// House rule carried over from modules/portfolio: nothing is fabricated. A
// position with no price contributes to no chart; the callers surface those
// symbols as an explicit "not included" note rather than silently dropping them.

import type { ConsolidatedRow, PositionRow } from "@/modules/portfolio"

/** Bucket for symbols Finnhub can't classify (mutual funds, collective trusts). */
export const UNCLASSIFIED = "Unclassified"

export interface Slice {
  label: string
  value: number
  /** Share of the charted total, 0–100. */
  pct: number
}

export interface Allocation {
  slices: Slice[]
  /** Sum of `slices[].value` — the denominator behind every pct. */
  total: number
  /** Priced-out symbols excluded from this chart, sorted. */
  excludedSymbols: string[]
}

function buildAllocation(
  rows: ConsolidatedRow[],
  bucketOf: (row: ConsolidatedRow) => string,
): Allocation {
  const totals = new Map<string, number>()
  const excluded: string[] = []
  let total = 0

  for (const row of rows) {
    if (row.value === null || row.value <= 0) {
      excluded.push(row.symbol)
      continue
    }
    const bucket = bucketOf(row)
    totals.set(bucket, (totals.get(bucket) ?? 0) + row.value)
    total += row.value
  }

  const slices = [...totals]
    .map(([label, value]) => ({
      label,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
    }))
    // Largest first, so the donut reads clockwise from the biggest holding and
    // the legend order matches the ring order.
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))

  return { slices, total, excludedSymbols: excluded.sort() }
}

/** Value split across industry sectors; unclassifiable symbols share a bucket. */
export function allocationBySector(rows: ConsolidatedRow[]): Allocation {
  return buildAllocation(rows, (row) => row.sector ?? UNCLASSIFIED)
}

/**
 * Value split by asset class. Only two classes exist in the data model
 * (`pt_holdings.asset_class`), so this is deliberately coarse — labelling an
 * ETF separately from a stock would require fund data we don't store.
 */
export function allocationByAssetClass(rows: ConsolidatedRow[]): Allocation {
  return buildAllocation(rows, (row) => (row.isCrypto ? "Crypto" : "Equities & funds"))
}

/** Bucket that absorbs the long tail past a chart's series cap. */
export const OTHER = "Other"

/**
 * Cap an allocation at `max` slices, folding the tail into one "Other" bucket.
 * The categorical palette is a fixed 8-hue order — past that, a 9th series
 * would mean inventing a hue, so the tail folds instead.
 */
export function foldSlices(allocation: Allocation, max: number): Allocation {
  if (max < 1 || allocation.slices.length <= max) return allocation

  const kept = allocation.slices.slice(0, max - 1)
  const tail = allocation.slices.slice(max - 1)
  const tailValue = tail.reduce((sum, slice) => sum + slice.value, 0)

  return {
    ...allocation,
    slices: [
      ...kept,
      {
        label: OTHER,
        value: tailValue,
        pct: allocation.total > 0 ? (tailValue / allocation.total) * 100 : 0,
      },
    ],
  }
}

export interface PositionSize {
  symbol: string
  companyName: string | null
  value: number
  pct: number
}

/** Every priced position, largest first — the treemap's input. */
export function positionSizes(rows: ConsolidatedRow[]): {
  items: PositionSize[]
  total: number
  excludedSymbols: string[]
} {
  const priced = rows.filter((row) => row.value !== null && row.value > 0)
  const excluded = rows
    .filter((row) => row.value === null || row.value <= 0)
    .map((row) => row.symbol)
    .sort()
  const total = priced.reduce((sum, row) => sum + row.value!, 0)

  const items = priced
    .map((row) => ({
      symbol: row.symbol,
      companyName: row.companyName,
      value: row.value!,
      pct: total > 0 ? (row.value! / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value || a.symbol.localeCompare(b.symbol))

  return { items, total, excludedSymbols: excluded }
}

export interface AccountSegment {
  accountId: string
  accountName: string
  value: number
  /** Share of this ticker's total value, 0–100. */
  pct: number
}

export interface TickerAccountBar {
  symbol: string
  companyName: string | null
  total: number
  segments: AccountSegment[]
}

/**
 * Per-ticker value broken down by the accounts holding it — answers "how much
 * of my GOOG sits in the 401k?". Tickers held in a single account are dropped:
 * a one-segment stacked bar carries no information the treemap doesn't already
 * show, and they'd crowd out the split ones.
 */
export function tickerAccountBars(
  rows: ConsolidatedRow[],
  limit = 12,
): TickerAccountBar[] {
  const bars: TickerAccountBar[] = []

  for (const row of rows) {
    const priced = row.positions.filter(
      (position): position is PositionRow & { value: number } =>
        position.value !== null && position.value > 0,
    )
    if (priced.length < 2) continue

    // One segment per account, even if an account holds the ticker twice.
    const byAccount = new Map<string, AccountSegment>()
    for (const position of priced) {
      const existing = byAccount.get(position.accountId)
      if (existing) {
        existing.value += position.value
      } else {
        byAccount.set(position.accountId, {
          accountId: position.accountId,
          accountName: position.accountName,
          value: position.value,
          pct: 0,
        })
      }
    }

    const total = [...byAccount.values()].reduce(
      (sum, segment) => sum + segment.value,
      0,
    )
    const segments = [...byAccount.values()]
      .map((segment) => ({ ...segment, pct: (segment.value / total) * 100 }))
      .sort((a, b) => b.value - a.value || a.accountName.localeCompare(b.accountName))

    bars.push({ symbol: row.symbol, companyName: row.companyName, total, segments })
  }

  return bars.sort((a, b) => b.total - a.total).slice(0, limit)
}

export interface IncomeBar {
  symbol: string
  companyName: string | null
  /** value × dividend yield — projected over the next 12 months. */
  annualIncome: number
  dividendYield: number
  /** Share of total projected income, 0–100. */
  pct: number
}

export interface IncomeBreakdown {
  bars: IncomeBar[]
  total: number
  /**
   * Held symbols with no dividend-yield data at all. Distinct from a real zero
   * (a non-payer): we can't tell those apart, so they're listed, not charted.
   */
  unknownYieldSymbols: string[]
}

/**
 * Projected annual dividend income per holding, largest first.
 *
 * NOT a calendar: Finnhub's dividend-date endpoint is premium-only, so we have
 * yields but no ex-div or pay dates. Spreading this across months would invent
 * timing the data doesn't support, so the chart stays annual.
 */
export function incomeBreakdown(rows: ConsolidatedRow[], limit = 15): IncomeBreakdown {
  const unknown: string[] = []
  const earning: IncomeBar[] = []
  let total = 0

  for (const row of rows) {
    if (row.dividendYield === null) {
      unknown.push(row.symbol)
      continue
    }
    if (row.projectedAnnualIncome === null || row.projectedAnnualIncome <= 0) continue

    total += row.projectedAnnualIncome
    earning.push({
      symbol: row.symbol,
      companyName: row.companyName,
      annualIncome: row.projectedAnnualIncome,
      dividendYield: row.dividendYield,
      pct: 0,
    })
  }

  const bars = earning
    .sort((a, b) => b.annualIncome - a.annualIncome || a.symbol.localeCompare(b.symbol))
    .slice(0, limit)
    .map((bar) => ({
      ...bar,
      pct: total > 0 ? (bar.annualIncome / total) * 100 : 0,
    }))

  return { bars, total, unknownYieldSymbols: unknown.sort() }
}
