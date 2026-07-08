export interface Quote {
  symbol: string
  price: number
  dayChangePct: number | null
  dividendYield: number | null
  /** When the price was fetched from Finnhub — drives the "as of" display. */
  fetchedAt: string
}

/**
 * What the UI consumes for one symbol. Never fabricated:
 * - price null   → no data exists anywhere ("unavailable")
 * - isStale true → cached value older than the TTL, served because a fresh
 *                  fetch wasn't possible (Finnhub down)
 */
export interface QuoteView {
  symbol: string
  price: number | null
  dayChangePct: number | null
  /** Annual dividend yield in percent (e.g. 0.55 = 0.55%); null when unknown. */
  dividendYield: number | null
  fetchedAt: string | null
  isStale: boolean
}
