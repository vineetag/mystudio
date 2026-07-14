// Pure cache-partition logic — no I/O, unit-tested.

import type { QuoteView } from "./types"

/** Serve from pt_quotes when fetched less than 15 minutes ago. */
export const QUOTE_TTL_MS = 15 * 60 * 1000

/** Dashboard poll interval — live refresh refetches when cache is older than this. */
export const QUOTE_POLL_MS = 60_000

/** Dividend yield changes slowly — refresh it alongside a price fetch at most daily. */
export const YIELD_TTL_MS = 24 * 60 * 60 * 1000

/** Row shape as it comes back from pt_quotes (numerics arrive as strings). */
export interface CachedQuoteRow {
  symbol: string
  price: string | number
  day_change_pct: string | number | null
  dividend_yield: string | number | null
  fetched_at: string
  yield_fetched_at: string | null
}

export function rowToQuoteView(row: CachedQuoteRow, isStale: boolean): QuoteView {
  return {
    symbol: row.symbol,
    price: Number(row.price),
    dayChangePct: row.day_change_pct === null ? null : Number(row.day_change_pct),
    dividendYield: row.dividend_yield === null ? null : Number(row.dividend_yield),
    fetchedAt: row.fetched_at,
    isStale,
  }
}

export function unavailableQuoteView(symbol: string): QuoteView {
  return {
    symbol,
    price: null,
    dayChangePct: null,
    dividendYield: null,
    fetchedAt: null,
    isStale: false,
  }
}

/**
 * True when the row's dividend yield needs a refresh: never fetched, or
 * older than YIELD_TTL_MS. A stored null yield with a recent timestamp is
 * fresh — it means "this symbol pays no dividend", not "unknown".
 */
export function yieldNeedsRefresh(
  row: Pick<CachedQuoteRow, "yield_fetched_at"> | undefined,
  now: Date,
): boolean {
  if (!row || row.yield_fetched_at === null) return true
  return now.getTime() - new Date(row.yield_fetched_at).getTime() >= YIELD_TTL_MS
}

/**
 * Merge a poll response into the current quote map, never letting an older
 * quote overwrite a newer one. The dashboard polls indices and holdings as
 * separate requests, and a slow force-refresh batch can land after a faster
 * cache-only response — without the timestamp guard the late arrival would
 * re-stale symbols the fast response already refreshed. Timestamps are
 * compared as dates, not strings: rows read from the cache carry `+00:00`
 * offsets while freshly fetched quotes carry `Z`.
 */
export function mergeQuoteViews(
  current: Map<string, QuoteView>,
  incoming: Record<string, QuoteView>,
): Map<string, QuoteView> {
  const next = new Map(current)
  for (const [symbol, quote] of Object.entries(incoming)) {
    const existing = next.get(symbol)
    if (
      existing?.fetchedAt &&
      quote.fetchedAt &&
      new Date(quote.fetchedAt).getTime() < new Date(existing.fetchedAt).getTime()
    ) {
      continue
    }
    next.set(symbol, quote)
  }
  return next
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

/** Force-refresh partition: refetch symbols missing or older than QUOTE_POLL_MS. */
export function partitionForPollRefresh(
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
    if (age < QUOTE_POLL_MS) {
      fresh.push(rowToQuoteView(row, false))
    } else {
      toFetch.push(symbol)
      // Only badge the fallback as stale past the cache TTL — a poll refresh
      // that fails on a two-minute-old price shouldn't alarm the dashboard.
      fallback.set(symbol, rowToQuoteView(row, age >= QUOTE_TTL_MS))
    }
  }

  return { fresh, toFetch, fallback }
}
