import "server-only"

import { UnknownSymbolError, type FinnhubQuote } from "./finnhub"

// Yahoo Finance chart API client for market index levels (^GSPC, ^IXIC).
// Finnhub's free tier rejects indices ("Market data subscription required
// for CFD indices"), so index symbols route here instead. The endpoint is
// unofficial but stable, needs no API key, and returns the live level plus
// the prior close in one call.

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface YahooChartBody {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number
        chartPreviousClose?: number
      }
    }> | null
    error?: { code?: string; description?: string } | null
  }
}

/**
 * Live index level via Yahoo Finance. Same contract as fetchFinnhubQuote:
 * throws UnknownSymbolError for symbols Yahoo doesn't know (engine skips
 * caching), plain Error after exhausting retries on 429/5xx/network failures
 * (engine falls back to the stale cached row).
 */
export async function fetchYahooIndexQuote(symbol: string): Promise<FinnhubQuote> {
  let lastError: Error = new Error("Index quote fetch failed.")

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))

    let response: Response
    try {
      response = await fetch(
        `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        {
          cache: "no-store",
          // Yahoo rejects keyless clients without a browser-like User-Agent.
          headers: { "User-Agent": "Mozilla/5.0 (onefolio-quotes)" },
        },
      )
    } catch (networkError) {
      lastError = new Error(
        `Network error reaching Yahoo Finance: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
      )
      continue
    }

    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`Yahoo Finance responded ${response.status}.`)
      continue
    }
    // Unknown symbols come back 404 with chart.error "Not Found".
    if (response.status === 404) {
      throw new UnknownSymbolError(symbol)
    }
    if (!response.ok) {
      throw new Error(`Yahoo Finance responded ${response.status} for "${symbol}".`)
    }

    const body = (await response.json()) as YahooChartBody
    const meta = body.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      throw new UnknownSymbolError(symbol)
    }

    const previousClose = meta?.chartPreviousClose
    const dayChangePct =
      typeof previousClose === "number" && Number.isFinite(previousClose) && previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : null

    return { price, dayChangePct }
  }

  throw lastError
}
