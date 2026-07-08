import "server-only"

import { createClient, createServiceClient } from "@/lib/db"
import { getViewer } from "@/modules/auth"
import {
  partitionByFreshness,
  rowToQuoteView,
  unavailableQuoteView,
  yieldNeedsRefresh,
  type CachedQuoteRow,
} from "./cache"
import {
  fetchFinnhubDividendYield,
  fetchFinnhubQuote,
  UnknownSymbolError,
} from "./finnhub"
import type { QuoteView } from "./types"

/** Fan-out cap: stays well under Finnhub's 60 calls/min for typical loads. */
const FETCH_CONCURRENCY = 4

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
  return results
}

export interface GetQuotesOptions {
  /**
   * Skip the viewer check. ONLY for server paths that carry their own
   * authentication and have no user session — today that's the CRON_SECRET-
   * guarded snapshot route. Never set this from anything reachable by an
   * anonymous request: demo mode must stay at zero key-bearing API calls.
   */
  trusted?: boolean
}

/**
 * Resolve quotes for a set of symbols, one QuoteView per unique symbol.
 *
 * - Cache hits (< 15 min) come straight from pt_quotes.
 * - Misses are fetched from Finnhub and upserted — but ONLY for the owner.
 *   Demo mode never triggers a key-bearing API call (guardrail): anonymous
 *   viewers get whatever is cached, marked stale where it is.
 * - A failed fetch falls back to the stale cached row; a symbol with no data
 *   anywhere comes back with price null ("unavailable"), never fabricated.
 */
export async function getQuotes(
  symbols: string[],
  options: GetQuotesOptions = {},
): Promise<Map<string, QuoteView>> {
  const unique = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()))]
    .filter((symbol) => symbol.length > 0)

  const views = new Map<string, QuoteView>()
  if (unique.length === 0) return views

  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from("pt_quotes")
    .select("symbol, price, day_change_pct, dividend_yield, fetched_at, yield_fetched_at")
    .in("symbol", unique)

  // Cache unreadable: degrade to "unavailable" rather than throwing the page.
  if (error) {
    console.error(`pt_quotes read failed: ${error.message}`)
    for (const symbol of unique) views.set(symbol, unavailableQuoteView(symbol))
    return views
  }

  const cachedRows = (rows ?? []) as CachedQuoteRow[]
  const cachedBySymbol = new Map(cachedRows.map((row) => [row.symbol, row]))
  const now = new Date()

  const { fresh, toFetch, fallback } = partitionByFreshness(unique, cachedRows, now)
  for (const view of fresh) views.set(view.symbol, view)

  const viewer = options.trusted ? null : await getViewer()
  if ((viewer !== null && !viewer.isOwner) || toFetch.length === 0) {
    for (const symbol of toFetch) {
      views.set(symbol, fallback.get(symbol) ?? unavailableQuoteView(symbol))
    }
    return views
  }

  const fetchedAt = new Date().toISOString()
  const results = await mapWithConcurrency(toFetch, FETCH_CONCURRENCY, async (symbol) => {
    try {
      const quote = await fetchFinnhubQuote(symbol)
      // Dividend yield rides along on a price refresh, at most once a day.
      // Best-effort: a null here either means "no dividend" (cached as such)
      // or a transient miss — either way the price still lands.
      const cached = cachedBySymbol.get(symbol)
      const refreshYield = yieldNeedsRefresh(cached, now)
      const dividendYield = refreshYield
        ? await fetchFinnhubDividendYield(symbol)
        : cached?.dividend_yield === null || cached?.dividend_yield === undefined
          ? null
          : Number(cached.dividend_yield)
      return { symbol, quote, dividendYield, refreshedYield: refreshYield }
    } catch (fetchError) {
      if (!(fetchError instanceof UnknownSymbolError)) {
        console.error(`Quote fetch failed for ${symbol}:`, fetchError)
      }
      return { symbol, quote: null, dividendYield: null, refreshedYield: false }
    }
  })

  const upsertRows = []
  for (const { symbol, quote, dividendYield, refreshedYield } of results) {
    if (quote) {
      views.set(symbol, {
        symbol,
        price: quote.price,
        dayChangePct: quote.dayChangePct,
        dividendYield,
        fetchedAt,
        isStale: false,
      })
      upsertRows.push({
        symbol,
        price: quote.price,
        day_change_pct: quote.dayChangePct,
        dividend_yield: dividendYield,
        fetched_at: fetchedAt,
        yield_fetched_at: refreshedYield
          ? fetchedAt
          : (cachedBySymbol.get(symbol)?.yield_fetched_at ?? null),
      })
    } else {
      views.set(symbol, fallback.get(symbol) ?? unavailableQuoteView(symbol))
    }
  }

  if (upsertRows.length > 0) {
    // Service role: pt_quotes has no client write policy by design.
    const service = createServiceClient()
    const { error: upsertError } = await service
      .from("pt_quotes")
      .upsert(upsertRows, { onConflict: "symbol" })
    if (upsertError) {
      // Views are already correct for this request; only the cache write failed.
      console.error(`pt_quotes upsert failed: ${upsertError.message}`)
    }
  }

  return views
}

export { rowToQuoteView }
