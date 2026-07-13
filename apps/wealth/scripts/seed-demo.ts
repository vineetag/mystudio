/**
 * Seeds (or re-seeds) the demo portfolio: ~9 accounts, ~29 tickers, mixed
 * gains/losses, several no-cost-basis 401k lots, one Finnhub-unsupported
 * symbol (FXAIX) so the "price unavailable" path is visible, and a Coinbase
 * account so crypto pricing/metadata are exercised in demo mode.
 *
 * Run (owner-initiated, so quote fetches respect the demo guardrail):
 *   pnpm --filter @studio/wealth seed:demo
 *
 * Wipes all is_demo rows and reinserts. Quotes: fetched live from Finnhub
 * when FINNHUB_API_KEY is set; otherwise baked demo prices are written with
 * an honest fetched_at so the UI shows real staleness.
 */

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: pnpm --filter @studio/wealth seed:demo",
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
})

type DemoHolding = {
  symbol: string
  quantity: number
  avgCost: number | null
  assetClass?: "equity" | "crypto"
}
type DemoAccount = {
  name: string
  broker: string
  accountType: "taxable" | "401k" | "roth_ira" | "brokerage_link"
  holdings: DemoHolding[]
}

// Baked reference prices — used for avg-cost realism and as the quote
// fallback when no Finnhub key is present. Deliberately fabricated: this is
// the intentional demo seed.
const REFERENCE_PRICES: Record<string, number> = {
  AAPL: 232, MSFT: 468, GOOG: 196, AMZN: 224, NVDA: 154, META: 702,
  TSLA: 262, "BRK.B": 486, JPM: 288, V: 344, UNH: 306, COST: 988,
  AVGO: 268, AMD: 136, CRM: 268, NFLX: 1284, DIS: 122, XOM: 112,
  JNJ: 156, KO: 70, PG: 158, HD: 366, VTI: 302, VOO: 562, SCHD: 27,
  FXAIX: 208, // Finnhub free tier has no data for this mutual fund
  BTC: 62700, ETH: 3400, SOL: 76, DOGE: 0.11,
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Fidelity 401(k)",
    broker: "Fidelity",
    accountType: "401k",
    holdings: [
      { symbol: "FXAIX", quantity: 412.882, avgCost: null },
      { symbol: "VTI", quantity: 180, avgCost: null },
      { symbol: "GOOG", quantity: 95, avgCost: null },
    ],
  },
  {
    name: "Fidelity BrokerageLink",
    broker: "Fidelity",
    accountType: "brokerage_link",
    holdings: [
      { symbol: "NVDA", quantity: 260, avgCost: 48.2 },
      { symbol: "GOOG", quantity: 120, avgCost: 138.5 },
      { symbol: "AVGO", quantity: 55, avgCost: 302.4 },
      { symbol: "AMD", quantity: 140, avgCost: 168.9 },
    ],
  },
  {
    name: "Fidelity Roth IRA",
    broker: "Fidelity",
    accountType: "roth_ira",
    holdings: [
      { symbol: "VOO", quantity: 62, avgCost: 398.1 },
      { symbol: "MSFT", quantity: 48, avgCost: 322.75 },
      { symbol: "GOOG", quantity: 40, avgCost: 105.3 },
      { symbol: "SCHD", quantity: 400, avgCost: 24.6 },
    ],
  },
  {
    name: "Schwab Taxable",
    broker: "Schwab",
    accountType: "taxable",
    holdings: [
      { symbol: "AAPL", quantity: 210, avgCost: 148.3 },
      { symbol: "BRK.B", quantity: 45, avgCost: 352.2 },
      { symbol: "JPM", quantity: 80, avgCost: 172.4 },
      { symbol: "DIS", quantity: 150, avgCost: 141.8 },
      { symbol: "GOOG", quantity: 85, avgCost: 152.6 },
    ],
  },
  {
    name: "Schwab Roth IRA",
    broker: "Schwab",
    accountType: "roth_ira",
    holdings: [
      { symbol: "UNH", quantity: 30, avgCost: 512.4 },
      { symbol: "JNJ", quantity: 90, avgCost: 162.1 },
      { symbol: "KO", quantity: 220, avgCost: 58.9 },
    ],
  },
  {
    name: "E*Trade Taxable",
    broker: "E*Trade",
    accountType: "taxable",
    holdings: [
      { symbol: "TSLA", quantity: 110, avgCost: 314.6 },
      { symbol: "META", quantity: 42, avgCost: 318.2 },
      { symbol: "NFLX", quantity: 180, avgCost: 92.8 },
      { symbol: "CRM", quantity: 60, avgCost: 291.7 },
    ],
  },
  {
    name: "Vanguard Taxable",
    broker: "Vanguard",
    accountType: "taxable",
    holdings: [
      { symbol: "VTI", quantity: 340, avgCost: 218.6 },
      { symbol: "V", quantity: 65, avgCost: 248.3 },
      { symbol: "PG", quantity: 85, avgCost: 144.2 },
      { symbol: "HD", quantity: 28, avgCost: 402.5 },
    ],
  },
  {
    name: "Robinhood",
    broker: "Robinhood",
    accountType: "taxable",
    holdings: [
      { symbol: "AMZN", quantity: 95, avgCost: 182.4 },
      { symbol: "COST", quantity: 12, avgCost: 1046.0 },
      { symbol: "XOM", quantity: 130, avgCost: 118.7 },
      { symbol: "GOOG", quantity: 25, avgCost: 208.4 },
    ],
  },
  {
    name: "Coinbase",
    broker: "Coinbase",
    accountType: "taxable",
    holdings: [
      // ETH exercises the explicit asset_class path (it collides with an
      // equity ticker, so inference alone would price it as a stock).
      { symbol: "BTC", quantity: 0.85, avgCost: 38500, assetClass: "crypto" },
      { symbol: "ETH", quantity: 6.2, avgCost: 2210, assetClass: "crypto" },
      { symbol: "SOL", quantity: 45, avgCost: 98.4, assetClass: "crypto" },
      { symbol: "DOGE", quantity: 12000, avgCost: 0.081, assetClass: "crypto" },
    ],
  },
]

// Mirrors modules/quotes/coinbase.ts, which can't be imported here (it is
// server-only Next.js code). Finnhub's crypto endpoints are premium-only.
async function fetchCoinbasePrice(
  symbol: string,
): Promise<{ price: number; dayChangePct: number | null } | null> {
  try {
    const response = await fetch(
      `https://api.exchange.coinbase.com/products/${encodeURIComponent(symbol)}-USD/stats`,
      { headers: { "User-Agent": "onefolio-seed" } },
    )
    if (!response.ok) return null
    const body = (await response.json()) as { open?: string; last?: string }
    const price = Number(body.last)
    if (!Number.isFinite(price) || price <= 0) return null
    const open = Number(body.open)
    return {
      price,
      dayChangePct:
        Number.isFinite(open) && open > 0 ? ((price - open) / open) * 100 : null,
    }
  } catch {
    return null
  }
}

async function fetchFinnhubPrice(
  symbol: string,
  apiKey: string,
): Promise<{ price: number; dayChangePct: number | null } | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    )
    if (!response.ok) return null
    const body = (await response.json()) as { c?: number; dp?: number | null }
    if (!body.c || body.c === 0) return null
    return { price: body.c, dayChangePct: typeof body.dp === "number" ? body.dp : null }
  } catch {
    return null
  }
}

async function main() {
  console.log("Deleting existing demo rows…")
  const { error: deleteError } = await supabase
    .from("pt_accounts")
    .delete()
    .eq("is_demo", true)
  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`)

  console.log(`Inserting ${DEMO_ACCOUNTS.length} demo accounts…`)
  const { data: inserted, error: accountsError } = await supabase
    .from("pt_accounts")
    .insert(
      DEMO_ACCOUNTS.map((account) => ({
        user_id: null,
        name: account.name,
        broker: account.broker,
        account_type: account.accountType,
        source: "manual",
        is_demo: true,
      })),
    )
    .select("id, name")
  if (accountsError) throw new Error(`Account insert failed: ${accountsError.message}`)

  const idByName = new Map(inserted!.map((row) => [row.name, row.id]))
  const holdingRows = DEMO_ACCOUNTS.flatMap((account) =>
    account.holdings.map((holding) => ({
      account_id: idByName.get(account.name)!,
      symbol: holding.symbol,
      quantity: holding.quantity,
      avg_cost: holding.avgCost,
      asset_class: holding.assetClass ?? "equity",
    })),
  )

  console.log(`Inserting ${holdingRows.length} holdings…`)
  const { error: holdingsError } = await supabase
    .from("pt_holdings")
    .insert(holdingRows)
  if (holdingsError) throw new Error(`Holdings insert failed: ${holdingsError.message}`)

  // Quotes: SPY/QQQ included so the demo dashboard widgets have data.
  const symbols = [
    ...new Set([...holdingRows.map((row) => row.symbol), "SPY", "QQQ"]),
  ]
  const apiKey = process.env.FINNHUB_API_KEY
  const fetchedAt = new Date().toISOString()
  const quoteRows: Array<{
    symbol: string
    price: number
    day_change_pct: number | null
    fetched_at: string
  }> = []

  const cryptoSymbols = new Set(
    DEMO_ACCOUNTS.flatMap((account) =>
      account.holdings
        .filter((holding) => holding.assetClass === "crypto")
        .map((holding) => holding.symbol),
    ),
  )

  if (apiKey) {
    console.log(`Fetching ${symbols.length} live quotes (Finnhub + Coinbase)…`)
    for (const symbol of symbols) {
      const quote = cryptoSymbols.has(symbol)
        ? await fetchCoinbasePrice(symbol)
        : await fetchFinnhubPrice(symbol, apiKey)
      if (quote) {
        quoteRows.push({
          symbol,
          price: quote.price,
          day_change_pct: quote.dayChangePct,
          fetched_at: fetchedAt,
        })
      } else {
        console.log(`  ${symbol}: no Finnhub data (left unpriced)`)
      }
      // Stay far under 60 calls/min.
      await new Promise((resolve) => setTimeout(resolve, 1100))
    }
  } else {
    console.log("No FINNHUB_API_KEY — writing baked demo prices instead.")
    const baked: Record<string, number> = {
      ...REFERENCE_PRICES,
      SPY: 618,
      QQQ: 552,
    }
    // FXAIX stays unpriced on purpose: it demos the "unavailable" path.
    delete baked.FXAIX
    for (const symbol of symbols) {
      const price = baked[symbol]
      if (price !== undefined) {
        quoteRows.push({
          symbol,
          price,
          day_change_pct: null,
          fetched_at: fetchedAt,
        })
      }
    }
  }

  if (quoteRows.length > 0) {
    const { error: quotesError } = await supabase
      .from("pt_quotes")
      .upsert(quoteRows, { onConflict: "symbol" })
    if (quotesError) throw new Error(`Quote upsert failed: ${quotesError.message}`)
  }

  console.log(
    `Done: ${DEMO_ACCOUNTS.length} accounts, ${holdingRows.length} holdings, ${quoteRows.length} quotes.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
