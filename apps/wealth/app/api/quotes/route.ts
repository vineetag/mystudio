import { NextResponse } from "next/server"
import { listViewerAccountsWithHoldings } from "@/modules/accounts"
import { getQuotes, type QuoteView } from "@/modules/quotes"

export const dynamic = "force-dynamic"

/** Same ETF proxies the dashboard shows — always refreshable. */
const INDEX_PROXIES = ["SPY", "QQQ"]

/**
 * Quote refresh for the dashboard's minute-poll.
 *
 * Quota guard: this route is reachable anonymously, and a refresh spends the
 * shared Finnhub budget (60 calls/min). Only symbols the viewer can actually
 * see — their visible portfolio's holdings plus the index proxies — are
 * accepted; anything else is dropped and reported back. Combined with the
 * 60-second poll partition in the engine, worst-case spend is bounded by the
 * portfolio size per minute regardless of how often the route is hit.
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
    ...INDEX_PROXIES,
  ])

  const symbols = requested.filter((symbol) => allowed.has(symbol))
  const rejected = requested.filter((symbol) => !allowed.has(symbol))

  if (symbols.length === 0) {
    return NextResponse.json(
      {
        error:
          "None of the requested symbols are in this portfolio — only visible holdings (plus SPY/QQQ) can be refreshed.",
      },
      { status: 400 },
    )
  }

  const forceRefresh = searchParams.get("refresh") === "1"
  const quotes = await getQuotes(symbols, { forceRefresh })

  const body: Record<string, QuoteView> = Object.fromEntries(quotes)
  return NextResponse.json(
    { quotes: body, ...(rejected.length > 0 ? { rejected } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  )
}
