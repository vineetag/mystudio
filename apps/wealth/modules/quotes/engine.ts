import "server-only"

import type { AssetClass } from "@/modules/holdings/asset-class"
import { inferAssetClass } from "@/modules/holdings/asset-class"
import { createClient, createServiceClient } from "@/lib/db"
import {
  partitionByFreshness,
  partitionForPollRefresh,
  rowToQuoteView,
  unavailableQuoteView,
  yieldNeedsRefresh,
  type CachedQuoteRow,
} from "./cache"
import {
  fetchFinnhubCryptoQuote,
  fetchFinnhubDividendYield,
  fetchFinnhubQuote,
  UnknownSymbolError,
} from "./finnhub"
import type { QuoteView } from "./types"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Finnhub free tier: 60 calls/min — one request per second keeps us under the cap. */
const FETCH_CONCURRENCY = 1
const FINNHUB_MIN_INTERVAL_MS = 1_100

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
  /** Bypass the 15 min TTL; refetch symbols older than QUOTE_POLL_MS from Finnhub. */
  forceRefresh?: boolean
  /**
   * Never call Finnhub: fresh rows served as-is, stale rows served flagged
   * isStale, missing symbols come back unavailable. For render paths that
   * must not block on the rate-paced fetch (the dashboard SSR).
   */
  cacheOnly?: boolean
  /** Per-symbol routing for equity vs crypto Finnhub endpoints. */
  assetClasses?: Map<string, AssetClass>
}

/**
 * Resolve quotes for a set of symbols, one QuoteView per unique symbol.
 *
 * - Cache hits (< 15 min) come straight from pt_quotes when not force-refreshing.
 * - Misses and stale rows are fetched from Finnhub and upserted into the shared
 *   pt_quotes cache (live and demo both read the same table).
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

  const { fresh, toFetch, fallback } = options.forceRefresh
    ? partitionForPollRefresh(unique, cachedRows, now)
    : partitionByFreshness(unique, cachedRows, now)
  for (const view of fresh) views.set(view.symbol, view)

  if (toFetch.length === 0) return views

  if (options.cacheOnly) {
    for (const symbol of toFetch) {
      views.set(symbol, fallback.get(symbol) ?? unavailableQuoteView(symbol))
    }
    return views
  }

  // Fetching is allowed for all modes — callers gate WHICH symbols may spend
  // Finnhub budget (dashboard/API restrict to visible holdings + proxies).
  const fetchedAt = new Date().toISOString()
  let lastFetchAt = 0
  const results = await mapWithConcurrency(toFetch, FETCH_CONCURRENCY, async (symbol) => {
    const elapsed = Date.now() - lastFetchAt
    if (elapsed < FINNHUB_MIN_INTERVAL_MS) {
      await sleep(FINNHUB_MIN_INTERVAL_MS - elapsed)
    }
    lastFetchAt = Date.now()

    try {
      const assetClass = inferAssetClass(
        symbol,
        options.assetClasses?.get(symbol) ?? "equity",
      )
      const quote =
        assetClass === "crypto"
          ? await fetchFinnhubCryptoQuote(symbol)
          : await fetchFinnhubQuote(symbol)
      const cached = cachedBySymbol.get(symbol)
      const refreshYield = assetClass !== "crypto" && yieldNeedsRefresh(cached, now)
      const dividendYield =
        assetClass === "crypto"
          ? null
          : refreshYield
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
    const service = createServiceClient()
    const { error: upsertError } = await service
      .from("pt_quotes")
      .upsert(upsertRows, { onConflict: "symbol" })
    if (upsertError) {
      console.error(`pt_quotes upsert failed: ${upsertError.message}`)
    }
  }

  return views
}

export { rowToQuoteView }
