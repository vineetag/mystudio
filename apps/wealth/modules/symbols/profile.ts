import "server-only"

// Finnhub company profile — resolves a ticker to its official company name and
// website domain. logo.dev's brand search is name-based and returns the wrong
// company for many tickers (AAPL→GoDaddy, BAC→Nulab), so names come from here;
// logo.dev is used only for the logo image, which it resolves correctly.
//
// Best-effort: any failure resolves to null so a name lookup never breaks a
// render. Mutual funds/ETFs Finnhub can't profile (FXAIX, FBGRX, …) return an
// error here → null name → the owner's manual-name override fills them in.

const BASE = "https://finnhub.io/api/v1"

export interface SymbolProfile {
  name: string
  /** Bare domain from the company website (e.g. "apple.com"); may be null. */
  domain: string | null
}

function domainFromUrl(weburl?: string | null): string | null {
  if (!weburl) return null
  try {
    const url = new URL(weburl.startsWith("http") ? weburl : `https://${weburl}`)
    return url.hostname.replace(/^www\./, "") || null
  } catch {
    return null
  }
}

export async function fetchSymbolProfile(symbol: string): Promise<SymbolProfile | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(
      `${BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { cache: "no-store" },
    )
    if (!response.ok) return null

    const body = (await response.json()) as { name?: string; weburl?: string }
    if (!body?.name) return null

    return { name: body.name.slice(0, 120), domain: domainFromUrl(body.weburl) }
  } catch {
    return null
  }
}
