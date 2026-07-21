import { after } from "next/server"
import { listViewerAccountsWithHoldings } from "@/modules/accounts"
import { assetClassMapFromAccounts } from "@/modules/holdings"
import { getQuotes } from "@/modules/quotes"
import { getSymbols } from "@/modules/symbols"
import { AnalyzerView } from "@/components/analyzer/analyzer-view"

export const dynamic = "force-dynamic"

export default async function AnalyzerPage() {
  const allAccounts = await listViewerAccountsWithHoldings()
  // Hidden accounts are out of every dashboard figure, so they're out of the
  // charts too — otherwise the two pages would disagree on the same total.
  const accounts = allAccounts.filter((account) => !account.hidden)

  const holdingSymbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )
  const assetClasses = assetClassMapFromAccounts(accounts)

  // Same first-paint contract as the dashboard: cache-only reads here, live
  // prices arrive via the client poll. Sectors come from the same pt_symbols
  // cache the names do, so the donut needs no extra fetch on the render path.
  const [quotes, symbols] = await Promise.all([
    getQuotes(holdingSymbols, { cacheOnly: true, assetClasses }),
    getSymbols(holdingSymbols, { fetchMissing: false, assetClasses }),
  ])

  // Warm names + sectors in the background; the first visit to this page after
  // deploy is what backfills sectors for symbols cached before they existed.
  if (holdingSymbols.length > 0) {
    after(async () => {
      await getSymbols(holdingSymbols, { assetClasses })
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Visual analyzer</h1>
        <p className="text-sm text-ink/60">
          Four views of the same holdings: what you own by sector, how big each
          position is, which accounts hold what, and what it pays.
        </p>
      </header>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule px-4 py-10 text-center text-sm text-ink/60">
          No accounts yet. Add one on the Accounts page and the charts fill in
          automatically.
        </p>
      ) : (
        <AnalyzerView
          accounts={accounts}
          initialQuotes={Object.fromEntries(quotes)}
          symbols={Object.fromEntries(symbols)}
        />
      )}
    </main>
  )
}
