export interface Quote {
  symbol: string
  price: number
  dayChangePct: number | null
  dividendYield: number | null
  /** When the price was fetched from Finnhub — drives the "as of" display. */
  fetchedAt: string
}
