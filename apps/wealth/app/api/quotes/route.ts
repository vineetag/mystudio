import { NextResponse } from "next/server"
import { getQuotes, type QuoteView } from "@/modules/quotes"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get("symbols")

  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols query param is required." }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(",")
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0)

  if (symbols.length === 0) {
    return NextResponse.json({ error: "Provide at least one symbol." }, { status: 400 })
  }

  const forceRefresh = searchParams.get("refresh") === "1"
  const quotes = await getQuotes(symbols, { forceRefresh })

  const body: Record<string, QuoteView> = Object.fromEntries(quotes)
  return NextResponse.json(
    { quotes: body },
    { headers: { "Cache-Control": "no-store" } },
  )
}
