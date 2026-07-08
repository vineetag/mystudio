import "server-only"

import { Snaptrade, SnaptradeError } from "snaptrade-typescript-sdk"

/**
 * SnapTrade is optional infrastructure: without keys the app builds and runs,
 * the connect UI simply doesn't render. Keys are server-side env only.
 */
export function isSnapTradeConfigured(): boolean {
  return (
    !!process.env.SNAPTRADE_CLIENT_ID && !!process.env.SNAPTRADE_CONSUMER_KEY
  )
}

let client: Snaptrade | null = null

export function getSnapTradeClient(): Snaptrade {
  if (!isSnapTradeConfigured()) {
    throw new Error(
      "SnapTrade is not configured — set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY.",
    )
  }
  if (!client) {
    client = new Snaptrade({
      clientId: process.env.SNAPTRADE_CLIENT_ID!,
      consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
    })
  }
  return client
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1000

/**
 * Run a SnapTrade call, retrying 429/5xx with exponential backoff — same
 * policy as the Finnhub client. Anything else (auth errors, bad requests)
 * surfaces immediately.
 */
export async function withSnapTradeRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))
    try {
      return await fn()
    } catch (error) {
      const status = error instanceof SnaptradeError ? error.status : undefined
      if (status === 429 || (typeof status === "number" && status >= 500)) {
        lastError = error
        continue
      }
      throw error
    }
  }
  throw lastError
}

/** Human-readable message from a failed SnapTrade call. */
export function snapTradeErrorMessage(error: unknown): string {
  if (error instanceof SnaptradeError) {
    // The axios message is generic ("Request failed with status code 400");
    // the actual reason lives in the JSON body as { detail, code }.
    const body = error.responseBody as
      | { detail?: string; code?: string }
      | null
      | undefined
    const detail =
      body && typeof body === "object" && typeof body.detail === "string"
        ? `${body.detail}${body.code ? ` (code ${body.code})` : ""}`
        : error.message
    return `SnapTrade responded ${error.status ?? "with an error"}: ${detail}`
  }
  return error instanceof Error ? error.message : String(error)
}
