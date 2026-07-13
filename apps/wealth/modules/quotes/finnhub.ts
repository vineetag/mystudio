import "server-only"

import { normalizeCryptoSymbol } from "@/modules/holdings/asset-class"

// Finnhub REST client. Free tier: 60 calls/min, no batch endpoint — the
// engine fans out per symbol with a concurrency cap and relies on the retry
// here for 429s. API key is server-side only.

const FINNHUB_BASE = "https://finnhub.io/api/v1"
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1200
const CRYPTO_EXCHANGE = "BINANCE"
const CRYPTO_QUOTE = "USDT"

export interface FinnhubQuote {
  price: number
  dayChangePct: number | null
}

/** Symbol Finnhub doesn't know (or has no price for) — do not cache. */
export class UnknownSymbolError extends Error {
  constructor(symbol: string) {
    super(`Finnhub has no price data for "${symbol}".`)
    this.name = "UnknownSymbolError"
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch one quote, retrying 429/5xx/network errors with exponential backoff.
 * Throws UnknownSymbolError (bad symbol) or Error (Finnhub unreachable) —
 * the engine turns those into stale-cache fallbacks or "unavailable".
 */
export async function fetchFinnhubQuote(symbol: string): Promise<FinnhubQuote> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not set — quotes cannot refresh.")
  }

  let lastError: Error = new Error("Quote fetch failed.")

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))

    let response: Response
    try {
      response = await fetch(
        `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
        { cache: "no-store" },
      )
    } catch (networkError) {
      lastError = new Error(
        `Network error reaching Finnhub: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
      )
      continue
    }

    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`Finnhub responded ${response.status}.`)
      continue
    }
    // Free tier returns 403 for unsupported symbols (e.g. mutual funds like FXAIX).
    if (response.status === 403 || response.status === 404) {
      throw new UnknownSymbolError(symbol)
    }
    if (!response.ok) {
      throw new Error(`Finnhub responded ${response.status} for "${symbol}".`)
    }

    const body = (await response.json()) as {
      c?: number
      dp?: number | null
      t?: number
    }

    // Finnhub signals an unknown symbol with an all-zero payload.
    if (!body.c || body.c === 0) {
      throw new UnknownSymbolError(symbol)
    }

    return {
      price: body.c,
      dayChangePct: typeof body.dp === "number" ? body.dp : null,
    }
  }

  throw lastError
}

function finnhubCryptoPair(symbol: string): string {
  const base = normalizeCryptoSymbol(symbol)
  return `${CRYPTO_EXCHANGE}:${base}${CRYPTO_QUOTE}`
}

interface FinnhubCandleBody {
  c?: number[]
  s?: string
}

/**
 * Spot crypto price via Finnhub's /crypto/candle endpoint (stock /quote does
 * not return cryptocurrency prices and may match an unrelated equity ticker).
 */
export async function fetchFinnhubCryptoQuote(symbol: string): Promise<FinnhubQuote> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not set — quotes cannot refresh.")
  }

  const pair = finnhubCryptoPair(symbol)
  const now = Math.floor(Date.now() / 1000)
  const intradayFrom = now - 3_600
  const dailyFrom = now - 86_400 * 5

  let lastError: Error = new Error("Crypto quote fetch failed.")

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))

    let intradayResponse: Response
    let dailyResponse: Response
    try {
      ;[intradayResponse, dailyResponse] = await Promise.all([
        fetch(
          `${FINNHUB_BASE}/crypto/candle?symbol=${encodeURIComponent(pair)}&resolution=1&from=${intradayFrom}&to=${now}&token=${apiKey}`,
          { cache: "no-store" },
        ),
        fetch(
          `${FINNHUB_BASE}/crypto/candle?symbol=${encodeURIComponent(pair)}&resolution=D&from=${dailyFrom}&to=${now}&token=${apiKey}`,
          { cache: "no-store" },
        ),
      ])
    } catch (networkError) {
      lastError = new Error(
        `Network error reaching Finnhub: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
      )
      continue
    }

    const retryable =
      intradayResponse.status === 429 ||
      intradayResponse.status >= 500 ||
      dailyResponse.status === 429 ||
      dailyResponse.status >= 500
    if (retryable) {
      lastError = new Error(
        `Finnhub responded ${intradayResponse.status}/${dailyResponse.status}.`,
      )
      continue
    }

    if (
      intradayResponse.status === 403 ||
      intradayResponse.status === 404 ||
      dailyResponse.status === 403 ||
      dailyResponse.status === 404
    ) {
      throw new UnknownSymbolError(symbol)
    }
    if (!intradayResponse.ok) {
      throw new Error(`Finnhub responded ${intradayResponse.status} for "${symbol}".`)
    }

    const intraday = (await intradayResponse.json()) as FinnhubCandleBody
    const closes = intraday.c?.filter((price) => price > 0) ?? []
    if (intraday.s !== "ok" || closes.length === 0) {
      throw new UnknownSymbolError(symbol)
    }

    const price = closes[closes.length - 1]
    let dayChangePct: number | null = null
    if (dailyResponse.ok) {
      const daily = (await dailyResponse.json()) as FinnhubCandleBody
      const dailyCloses = daily.c?.filter((value) => value > 0) ?? []
      if (daily.s === "ok" && dailyCloses.length >= 1) {
        const previousClose = dailyCloses[dailyCloses.length - 1]
        if (previousClose > 0) {
          dayChangePct = ((price - previousClose) / previousClose) * 100
        }
      }
    }

    return { price, dayChangePct }
  }

  throw lastError
}

/**
 * Fetch a symbol's annual dividend yield (percent) from Finnhub's basic
 * financials. Best-effort by design: any failure — endpoint not on the free
 * tier, unknown symbol, network trouble — resolves to null so a yield lookup
 * can never break a price refresh. Retries 429/5xx like the quote fetch.
 */
export async function fetchFinnhubDividendYield(
  symbol: string,
): Promise<number | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))

    let response: Response
    try {
      response = await fetch(
        `${FINNHUB_BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`,
        { cache: "no-store" },
      )
    } catch {
      continue
    }

    if (response.status === 429 || response.status >= 500) continue
    if (!response.ok) return null

    const body = (await response.json()) as {
      metric?: {
        currentDividendYieldTTM?: number | null
        dividendYieldIndicatedAnnual?: number | null
      }
    }

    const yieldPct =
      body.metric?.currentDividendYieldTTM ??
      body.metric?.dividendYieldIndicatedAnnual ??
      null
    return typeof yieldPct === "number" && yieldPct >= 0 ? yieldPct : null
  }

  return null
}
