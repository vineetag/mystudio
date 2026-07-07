import "server-only"

// Finnhub REST client. Free tier: 60 calls/min, no batch endpoint — the
// engine fans out per symbol with a concurrency cap and relies on the retry
// here for 429s. API key is server-side only.

const FINNHUB_BASE = "https://finnhub.io/api/v1"
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1200

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
