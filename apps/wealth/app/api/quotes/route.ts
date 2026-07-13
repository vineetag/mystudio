import { NextResponse } from "next/server"
import { listViewerAccountsWithHoldings } from "@/modules/accounts"
import { assetClassMapFromAccounts } from "@/modules/holdings"
import {
  acquireQuoteRefreshLease,
  getQuotes,
  INDEX_SYMBOLS,
  type QuoteView,
} from "@/modules/quotes"

export const dynamic = "force-dynamic"

/**
 * Quote refresh for the dashboard's minute-poll.
 *
 * Quota guard: this route is reachable anonymously, and a refresh spends the
 * shared Finnhub budget (60 calls/min). Only symbols the viewer can actually
 * see — their visible portfolio's holdings plus the market indices — are
 * accepted; anything else is dropped and reported back. Combined with the
 * global refresh lease (one paced fetch batch per poll interval, shared by
 * all clients), worst-case spend is bounded by the portfolio size per minute
 * regardless of how many dashboards are open or how often the route is hit.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get("symbols")

  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols query param is required." }, { status: 400 })
  }

  const requested = [
    ...new Set(
      symbolsParam
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => symbol.length > 0),
    ),
  ]

  if (requested.length === 0) {
    return NextResponse.json({ error: "Provide at least one symbol." }, { status: 400 })
  }

  const accounts = await listViewerAccountsWithHoldings()
  const allowed = new Set([
    ...accounts.flatMap((account) => account.holdings.map((holding) => holding.symbol)),
    ...INDEX_SYMBOLS,
  ])

  const symbols = requested.filter((symbol) => allowed.has(symbol))
  const rejected = requested.filter((symbol) => !allowed.has(symbol))

  if (symbols.length === 0) {
    return NextResponse.json(
      {
        error:
          "None of the requested symbols are in this portfolio — only visible holdings (plus the market indices) can be refreshed.",
      },
      { status: 400 },
    )
  }

  // One paced Finnhub batch per minute globally: the poller that wins the
  // lease force-refreshes; every other tab, device, or visitor reads the
  // cache that batch keeps warm instead of spending the shared rate limit.
  const refreshRequested = searchParams.get("refresh") === "1"
  const forceRefresh = refreshRequested && (await acquireQuoteRefreshLease())
  const assetClasses = assetClassMapFromAccounts(accounts)
  const quotes = await getQuotes(
    symbols,
    forceRefresh ? { forceRefresh, assetClasses } : { cacheOnly: true, assetClasses },
  )

  const body: Record<string, QuoteView> = Object.fromEntries(quotes)
  return NextResponse.json(
    { quotes: body, ...(rejected.length > 0 ? { rejected } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  )
}
