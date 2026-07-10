import { after } from "next/server"
import {
  ACCOUNT_TYPE_LABELS,
  listViewerAccountsWithHoldings,
} from "@/modules/accounts"
import { getViewer } from "@/modules/auth"
import { getQuotes } from "@/modules/quotes"
import { getSymbols } from "@/modules/symbols"
import { captureSnapshot, listSnapshots } from "@/modules/snapshots"
import { LiveDashboard } from "@/components/live-dashboard"

export const dynamic = "force-dynamic"

const INDEX_PROXIES = ["SPY", "QQQ"] as const

export default async function DashboardPage() {
  const [viewer, accounts] = await Promise.all([
    getViewer(),
    listViewerAccountsWithHoldings(),
  ])

  const holdingSymbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )

  // SSR serves whatever the 15-min cache has — instantly. The client poll
  // (LiveDashboard) force-refreshes within a minute; blocking first paint on
  // a serialized Finnhub fan-out took 30+ seconds on a cold cache.
  const [quotes, symbols, snapshots] = await Promise.all([
    getQuotes([...holdingSymbols, ...INDEX_PROXIES]),
    // Cache-only for a fast first paint; name resolution is rate-paced and runs
    // in the background below (logos render immediately regardless of names).
    getSymbols(holdingSymbols, { fetchMissing: false }),
    viewer.isOwner ? listSnapshots(370) : Promise.resolve([]),
  ])

  // Warm the shared symbol-name cache without blocking the response.
  if (holdingSymbols.length > 0) {
    after(async () => {
      await getSymbols(holdingSymbols)
    })
  }

  if (viewer.isOwner && accounts.length > 0) {
    after(async () => {
      const result = await captureSnapshot()
      if (!result.ok) console.error(result.error)
    })
  }

  return (
    <LiveDashboard
      accounts={accounts}
      initialQuotes={Object.fromEntries(quotes)}
      symbols={Object.fromEntries(symbols)}
      isOwner={viewer.isOwner}
      accountCount={accounts.length}
      accountTypeLabels={ACCOUNT_TYPE_LABELS}
      snapshots={snapshots}
    />
  )
}
