// Pure cache-partition logic — no I/O, unit-tested.

import type { QuoteView } from "./types"

/** Serve from pt_quotes when fetched less than 15 minutes ago. */
export const QUOTE_TTL_MS = 15 * 60 * 1000

/** Row shape as it comes back from pt_quotes (numerics arrive as strings). */
export interface CachedQuoteRow {
  symbol: string
  price: string | number
  day_change_pct: string | number | null
  fetched_at: string
}

export function rowToQuoteView(row: CachedQuoteRow, isStale: boolean): QuoteView {
  return {
    symbol: row.symbol,
    price: Number(row.price),
    dayChangePct: row.day_change_pct === null ? null : Number(row.day_change_pct),
    fetchedAt: row.fetched_at,
    isStale,
  }
}

export function unavailableQuoteView(symbol: string): QuoteView {
  return { symbol, price: null, dayChangePct: null, fetchedAt: null, isStale: false }
}

export interface CachePartition {
  /** Views servable as-is (fetched within the TTL). */
  fresh: QuoteView[]
  /** Symbols needing a fetch (stale or absent from cache). */
  toFetch: string[]
  /** Stale cached fallbacks by symbol, for when the fetch fails or is not allowed. */
  fallback: Map<string, QuoteView>
}

export function partitionByFreshness(
  symbols: string[],
  rows: CachedQuoteRow[],
  now: Date,
): CachePartition {
  const rowBySymbol = new Map(rows.map((row) => [row.symbol, row]))
  const fresh: QuoteView[] = []
  const toFetch: string[] = []
  const fallback = new Map<string, QuoteView>()

  for (const symbol of symbols) {
    const row = rowBySymbol.get(symbol)
    if (!row) {
      toFetch.push(symbol)
      continue
    }
    const age = now.getTime() - new Date(row.fetched_at).getTime()
    if (age < QUOTE_TTL_MS) {
      fresh.push(rowToQuoteView(row, false))
    } else {
      toFetch.push(symbol)
      fallback.set(symbol, rowToQuoteView(row, true))
    }
  }

  return { fresh, toFetch, fallback }
}
