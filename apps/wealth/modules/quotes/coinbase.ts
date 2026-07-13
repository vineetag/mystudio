import "server-only"

import { normalizeCryptoSymbol } from "@/modules/holdings"
import { UnknownSymbolError, type FinnhubQuote } from "./finnhub"

// Coinbase Exchange public market-data client for crypto spot prices.
// Finnhub's /crypto/candle endpoint is premium-only (403 on the free tier),
// so crypto symbols route here instead. The stats endpoint needs no API key
// and returns last price + 24h open in one call.

const COINBASE_BASE = "https://api.exchange.coinbase.com"
const CRYPTO_QUOTE_CURRENCY = "USD"
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function coinbaseProduct(symbol: string): string {
  return `${normalizeCryptoSymbol(symbol)}-${CRYPTO_QUOTE_CURRENCY}`
}

interface CoinbaseStatsBody {
  open?: string
  last?: string
}

/**
 * Spot crypto price via Coinbase Exchange 24h stats. Same contract as
 * fetchFinnhubQuote: throws UnknownSymbolError for symbols Coinbase doesn't
 * list (engine skips caching), plain Error after exhausting retries on
 * 429/5xx/network failures (engine falls back to the stale cached row).
 */
export async function fetchCoinbaseCryptoQuote(symbol: string): Promise<FinnhubQuote> {
  const product = coinbaseProduct(symbol)

  let lastError: Error = new Error("Crypto quote fetch failed.")

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))

    let response: Response
    try {
      response = await fetch(`${COINBASE_BASE}/products/${product}/stats`, {
        cache: "no-store",
        headers: { "User-Agent": "onefolio-quotes" },
      })
    } catch (networkError) {
      lastError = new Error(
        `Network error reaching Coinbase: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
      )
      continue
    }

    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`Coinbase responded ${response.status}.`)
      continue
    }
    // Unknown trading pair (e.g. a delisted coin) comes back 404 NotFound.
    if (response.status === 404) {
      throw new UnknownSymbolError(symbol)
    }
    if (!response.ok) {
      throw new Error(`Coinbase responded ${response.status} for "${symbol}".`)
    }

    const body = (await response.json()) as CoinbaseStatsBody
    const price = Number(body.last)
    if (!Number.isFinite(price) || price <= 0) {
      throw new UnknownSymbolError(symbol)
    }

    const open = Number(body.open)
    const dayChangePct =
      Number.isFinite(open) && open > 0 ? ((price - open) / open) * 100 : null

    return { price, dayChangePct }
  }

  throw lastError
}
