import "server-only"

// SimpleFIN Bridge REST client. The access URL embeds Basic Auth credentials
// (https://user:pass@bridge.../simplefin) — it is a bearer credential and must
// never be logged, sent to the client, or echoed into error messages. Free
// tier guidance caps usage around 24 requests/day; we sync at most every
// SYNC_TTL_MS (see sync.ts) plus one daily cron, well under that.

const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 1500

/** Raw SimpleFIN /accounts response shapes (protocol field names). */
export interface SimpleFinOrg {
  name?: string
  domain?: string
}

export interface SimpleFinAccount {
  id: string
  name: string
  currency: string
  /** Decimal string, e.g. "1204.36". */
  balance: string
  "available-balance"?: string
  /** Unix seconds when the institution says the balance was accurate. */
  "balance-date"?: number
  org?: SimpleFinOrg
}

export interface SimpleFinAccountSet {
  /** Human-readable warnings: stale connections, rate limits. Never ignore. */
  errors: string[]
  accounts: SimpleFinAccount[]
}

export function isSimpleFinConfigured(): boolean {
  return !!process.env.SIMPLEFIN_ACCESS_URL
}

/**
 * Split the access URL into a credential-free endpoint plus an Authorization
 * header. fetch() rejects URLs with embedded credentials, and keeping the
 * secret out of the URL keeps it out of any error/stack that quotes the URL.
 */
export function parseAccessUrl(accessUrl: string): {
  baseUrl: string
  authorization: string
} {
  let url: URL
  try {
    url = new URL(accessUrl)
  } catch {
    throw new Error("SIMPLEFIN_ACCESS_URL is not a valid URL.")
  }
  if (!url.username || !url.password) {
    throw new Error(
      "SIMPLEFIN_ACCESS_URL must embed credentials (https://user:pass@host/simplefin).",
    )
  }
  const authorization = `Basic ${Buffer.from(
    `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`,
  ).toString("base64")}`
  url.username = ""
  url.password = ""
  const baseUrl = url.toString().replace(/\/$/, "")
  return { baseUrl, authorization }
}

/**
 * Fetch all account balances (balances-only skips transaction history).
 * Retries 429/5xx/network errors with exponential backoff. Throws on
 * missing/invalid configuration or when SimpleFIN stays unreachable —
 * callers keep serving the cached pt_bank_accounts rows in that case.
 */
export async function fetchSimpleFinAccounts(): Promise<SimpleFinAccountSet> {
  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL
  if (!accessUrl) {
    throw new Error("SIMPLEFIN_ACCESS_URL is not set — bank sync is disabled.")
  }
  const { baseUrl, authorization } = parseAccessUrl(accessUrl)

  let lastError: Error = new Error("SimpleFIN fetch failed.")

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, BASE_DELAY_MS * 2 ** (attempt - 1)),
      )
    }

    let response: Response
    try {
      response = await fetch(`${baseUrl}/accounts?balances-only=1`, {
        headers: { Authorization: authorization },
        cache: "no-store",
      })
    } catch (networkError) {
      lastError = new Error(
        `Network error reaching SimpleFIN: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
      )
      continue
    }

    if (response.status === 403) {
      // Access revoked or token replaced — retrying won't help.
      throw new Error(
        "SimpleFIN responded 403 — the access URL was revoked. Generate a new setup token from the SimpleFIN Bridge dashboard.",
      )
    }
    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`SimpleFIN responded ${response.status}.`)
      continue
    }
    if (!response.ok) {
      throw new Error(`SimpleFIN responded ${response.status}.`)
    }

    const payload = (await response.json()) as Partial<SimpleFinAccountSet>
    return {
      errors: Array.isArray(payload.errors) ? payload.errors : [],
      accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
    }
  }

  throw lastError
}
