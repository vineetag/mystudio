// Pure derivation: holdings × quotes × accounts → display rows.
// No I/O — unit-tested. Null means "not computable" and renders as
// unavailable; nothing is ever fabricated.

import type { QuoteView } from "@/modules/quotes"
import type { SymbolInfo } from "@/modules/symbols"
import { inferAssetClass, type AssetClass } from "@/modules/holdings"

/** Minimum account shape for quote derivation — works with full rows or SSR props. */
export interface DeriveAccountInput {
  id: string
  name: string
  holdings: {
    id: string
    symbol: string
    quantity: number
    avgCost: number | null
    /** Priced/displayed as crypto when "crypto"; defaults to equity. */
    assetClass?: AssetClass
  }[]
}

/** One holding in one account, enriched with its quote and derived figures. */
export interface PositionRow {
  holdingId: string
  accountId: string
  accountName: string
  symbol: string
  /** Official company/fund name for display; null when unresolved. */
  companyName: string | null
  /** Resolved company domain — drives the higher-quality logo image; may be null. */
  logoDomain: string | null
  /** Crypto positions display finer quantity precision than equities. */
  isCrypto: boolean
  quantity: number
  avgCost: number | null
  /** True when the row has no cost basis (401k transfer) — badged, no gain/loss. */
  missingCostBasis: boolean
  price: number | null
  dayChangePct: number | null
  fetchedAt: string | null
  isStaleQuote: boolean
  value: number | null
  gainLoss: number | null
  gainLossPct: number | null
  /** Annual dividend yield in percent; null when the quote has no yield data. */
  dividendYield: number | null
  /** value × yield — projected annual dividend income; null when not computable. */
  projectedAnnualIncome: number | null
}

/** One row per ticker across all accounts. */
export interface ConsolidatedRow {
  symbol: string
  companyName: string | null
  logoDomain: string | null
  isCrypto: boolean
  quantity: number
  /** Weighted average over positions that have a cost basis; null if none do. */
  avgCost: number | null
  missingCostBasis: boolean
  price: number | null
  dayChangePct: number | null
  fetchedAt: string | null
  isStaleQuote: boolean
  value: number | null
  gainLoss: number | null
  gainLossPct: number | null
  dividendYield: number | null
  projectedAnnualIncome: number | null
  positions: PositionRow[]
}

export interface PortfolioTotal {
  value: number
  /** Symbols whose price is unavailable — their value is NOT in `value`. */
  unpricedSymbols: string[]
  /** Sum of projected annual dividend income over positions where it's known. */
  projectedAnnualIncome: number
}

export function derivePositions(
  accounts: DeriveAccountInput[],
  quotes: Map<string, QuoteView>,
  symbols?: Map<string, SymbolInfo>,
): PositionRow[] {
  const rows: PositionRow[] = []

  for (const account of accounts) {
    for (const holding of account.holdings) {
      const quote = quotes.get(holding.symbol)
      const symbolInfo = symbols?.get(holding.symbol)
      const price = quote?.price ?? null
      const hasBasis = holding.avgCost !== null

      const value = price === null ? null : price * holding.quantity
      const gainLoss =
        price !== null && hasBasis
          ? (price - holding.avgCost!) * holding.quantity
          : null
      const gainLossPct =
        price !== null && hasBasis && holding.avgCost! > 0
          ? ((price - holding.avgCost!) / holding.avgCost!) * 100
          : null

      const dividendYield = quote?.dividendYield ?? null
      const projectedAnnualIncome =
        value !== null && dividendYield !== null
          ? value * (dividendYield / 100)
          : null

      rows.push({
        holdingId: holding.id,
        accountId: account.id,
        accountName: account.name,
        symbol: holding.symbol,
        companyName: symbolInfo?.name ?? null,
        logoDomain: symbolInfo?.domain ?? null,
        isCrypto: inferAssetClass(holding.symbol, holding.assetClass ?? "equity") === "crypto",
        quantity: holding.quantity,
        avgCost: holding.avgCost,
        missingCostBasis: !hasBasis,
        price,
        dayChangePct: quote?.dayChangePct ?? null,
        fetchedAt: quote?.fetchedAt ?? null,
        isStaleQuote: quote?.isStale ?? false,
        value,
        gainLoss,
        gainLossPct,
        dividendYield,
        projectedAnnualIncome,
      })
    }
  }

  return rows
}

/** Group positions by symbol; sort by value descending (unpriced last). */
export function consolidate(positions: PositionRow[]): ConsolidatedRow[] {
  const bySymbol = new Map<string, PositionRow[]>()
  for (const position of positions) {
    const group = bySymbol.get(position.symbol)
    if (group) {
      group.push(position)
    } else {
      bySymbol.set(position.symbol, [position])
    }
  }

  const rows: ConsolidatedRow[] = []
  for (const [symbol, group] of bySymbol) {
    const first = group[0]
    const quantity = group.reduce((sum, position) => sum + position.quantity, 0)

    // Gain/loss aggregates only over positions with a cost basis AND a price.
    const basisPositions = group.filter(
      (position) => position.avgCost !== null,
    )
    const basisQuantity = basisPositions.reduce(
      (sum, position) => sum + position.quantity,
      0,
    )
    const costBasis = basisPositions.reduce(
      (sum, position) => sum + position.avgCost! * position.quantity,
      0,
    )
    const avgCost = basisQuantity > 0 ? costBasis / basisQuantity : null

    const price = first.price
    const value = price === null ? null : price * quantity
    const gainLoss =
      price !== null && basisQuantity > 0
        ? price * basisQuantity - costBasis
        : null
    const gainLossPct =
      gainLoss !== null && costBasis > 0 ? (gainLoss / costBasis) * 100 : null

    const dividendYield = first.dividendYield
    const projectedAnnualIncome =
      value !== null && dividendYield !== null
        ? value * (dividendYield / 100)
        : null

    rows.push({
      symbol,
      companyName: first.companyName,
      logoDomain: first.logoDomain,
      isCrypto: first.isCrypto,
      quantity,
      avgCost,
      missingCostBasis: group.some((position) => position.missingCostBasis),
      price,
      dayChangePct: first.dayChangePct,
      fetchedAt: first.fetchedAt,
      isStaleQuote: first.isStaleQuote,
      value,
      gainLoss,
      gainLossPct,
      dividendYield,
      projectedAnnualIncome,
      positions: [...group].sort((a, b) =>
        a.accountName.localeCompare(b.accountName),
      ),
    })
  }

  return rows.sort((a, b) => {
    if (a.value === null && b.value === null) return a.symbol.localeCompare(b.symbol)
    if (a.value === null) return 1
    if (b.value === null) return -1
    return b.value - a.value
  })
}

export function portfolioTotal(positions: PositionRow[]): PortfolioTotal {
  let value = 0
  let projectedAnnualIncome = 0
  const unpriced = new Set<string>()
  for (const position of positions) {
    if (position.value === null) {
      unpriced.add(position.symbol)
    } else {
      value += position.value
    }
    if (position.projectedAnnualIncome !== null) {
      projectedAnnualIncome += position.projectedAnnualIncome
    }
  }
  return { value, unpricedSymbols: [...unpriced].sort(), projectedAnnualIncome }
}
