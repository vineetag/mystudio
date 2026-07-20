// Builds the DATA blocks handed to the model. Pure — no I/O, unit-tested.
//
// Two constraints shape everything here:
//   1. Tokens are money. Every field costs input tokens on each run, so the
//      format is compact and only carries what the prompts actually reason on.
//   2. The model has no other source for these numbers. Unavailable figures are
//      written as "unavailable" rather than omitted, so the prompts' "say so
//      instead of estimating" rule has something concrete to latch onto.

import type { ConsolidatedRow, PortfolioTotal } from "@/modules/portfolio"

/** Money with no thousands separators — shorter, and the model doesn't care. */
function money(value: number | null): string {
  return value === null ? "unavailable" : value.toFixed(2)
}

function pct(value: number | null): string {
  return value === null ? "unavailable" : `${value.toFixed(2)}%`
}

function qty(value: number, isCrypto: boolean): string {
  return isCrypto ? value.toFixed(6) : value.toFixed(4).replace(/\.?0+$/, "")
}

/** Share of the priced portfolio, or null when either side is unknown. */
function weightPct(value: number | null, totalValue: number): number | null {
  if (value === null || totalValue <= 0) return null
  return (value / totalValue) * 100
}

/** One line per holding: the densest form the prompts can still read. */
function positionLine(row: ConsolidatedRow, totalValue: number): string {
  const name = row.companyName ? ` (${row.companyName})` : ""
  const accounts = row.positions.map((p) => p.accountName).join(", ")
  const parts = [
    `${row.symbol}${name}`,
    `qty ${qty(row.quantity, row.isCrypto)}`,
    `price ${money(row.price)}`,
    `value ${money(row.value)}`,
    `weight ${pct(weightPct(row.value, totalValue))}`,
    `avg cost ${money(row.avgCost)}`,
    `gain/loss ${money(row.gainLoss)} (${pct(row.gainLossPct)})`,
    `yield ${pct(row.dividendYield)}`,
    `accounts: ${accounts}`,
  ]
  if (row.missingCostBasis) parts.push("NOTE: some lots have no cost basis")
  if (row.priceIsBrokerNav) parts.push("NOTE: price is broker NAV, not a live quote")
  if (row.isStaleQuote) parts.push("NOTE: quote is stale")
  return `- ${parts.join(" | ")}`
}

export interface PortfolioContextInput {
  rows: ConsolidatedRow[]
  total: PortfolioTotal
  /** Account names by type, for the structure section. */
  accounts: { name: string; typeLabel: string }[]
  asOf: Date
}

/**
 * The whole-portfolio DATA block. Rows arrive sorted by value descending from
 * `consolidate()`, so the model reads the largest positions first.
 */
export function buildPortfolioContext(input: PortfolioContextInput): string {
  const { rows, total, accounts, asOf } = input
  const lines: string[] = []

  lines.push(`As of: ${asOf.toISOString()}`)
  lines.push(`Total priced value: ${money(total.value)} USD`)
  lines.push(
    `Projected annual dividend income: ${money(total.projectedAnnualIncome)} USD`,
  )
  lines.push(`Distinct tickers: ${rows.length}`)

  if (total.unpricedSymbols.length > 0) {
    lines.push(
      `Unpriced symbols (EXCLUDED from the total above): ${total.unpricedSymbols.join(", ")}`,
    )
  }

  lines.push("")
  lines.push("Accounts:")
  for (const account of accounts) {
    lines.push(`- ${account.name} (${account.typeLabel})`)
  }

  lines.push("")
  lines.push("Holdings, largest first:")
  for (const row of rows) {
    lines.push(positionLine(row, total.value))
  }

  return lines.join("\n")
}

/**
 * The single-holding DATA block. Includes portfolio-level totals because
 * position sizing is the one thing the owner can't eyeball, and the prompt
 * asks the model to lead with it.
 */
export function buildHoldingContext(
  row: ConsolidatedRow,
  total: PortfolioTotal,
  asOf: Date,
): string {
  const lines: string[] = []

  lines.push(`As of: ${asOf.toISOString()}`)
  lines.push(`Symbol: ${row.symbol}`)
  lines.push(`Company: ${row.companyName ?? "unavailable"}`)
  lines.push(`Asset class: ${row.isCrypto ? "crypto" : "equity or fund"}`)
  lines.push("")
  lines.push("Position:")
  lines.push(positionLine(row, total.value))
  lines.push("")
  lines.push("Per-account breakdown:")
  for (const position of row.positions) {
    lines.push(
      `- ${position.accountName}: qty ${qty(position.quantity, position.isCrypto)}` +
        ` | value ${money(position.value)} | avg cost ${money(position.avgCost)}`,
    )
  }
  lines.push("")
  lines.push(`Total portfolio priced value: ${money(total.value)} USD`)

  return lines.join("\n")
}

/**
 * The research DATA block for a symbol the owner does NOT hold. Often just a
 * quote — the prompt is written to expect a sparse block and to date its own
 * remembered figures accordingly.
 */
export function buildResearchContext(
  symbol: string,
  quote: { price: number; dayChangePct: number | null; fetchedAt: string | null } | null,
  asOf: Date,
): string {
  const lines: string[] = []
  lines.push(`As of: ${asOf.toISOString()}`)
  lines.push(`Symbol: ${symbol}`)
  lines.push("Held in portfolio: no")

  if (quote) {
    lines.push(
      `Live price: ${money(quote.price)} USD (quoted ${quote.fetchedAt ?? "at an unknown time"})`,
    )
    lines.push(`Day change: ${pct(quote.dayChangePct)}`)
  } else {
    lines.push("Live price: unavailable — we could not fetch a quote for this symbol.")
  }

  return lines.join("\n")
}
