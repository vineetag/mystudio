import { after } from "next/server"
import {
  ACCOUNT_TYPE_LABELS,
  listViewerAccountsWithHoldings,
} from "@/modules/accounts"
import { assetClassMapFromAccounts } from "@/modules/holdings"
import { getViewer } from "@/modules/auth"
import { getQuotes, INDEX_SYMBOLS } from "@/modules/quotes"
import { getSymbols } from "@/modules/symbols"
import { captureSnapshot, listSnapshots } from "@/modules/snapshots"
import { LiveDashboard } from "@/components/live-dashboard"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>
}) {
  const [viewer, allAccounts, params] = await Promise.all([
    getViewer(),
    listViewerAccountsWithHoldings(),
    searchParams,
  ])

  // Hidden accounts never reach the dashboard: they're out of the total,
  // the tables, and the quote poll. Manage/unhide them on /accounts.
  const accounts = allAccounts.filter((account) => !account.hidden)
  const hiddenCount = allAccounts.length - accounts.length

  const holdingSymbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )
  const assetClasses = assetClassMapFromAccounts(accounts)

  // SSR serves whatever the quote cache has — fresh or flagged stale — and
  // never calls Finnhub. LiveDashboard polls /api/quotes on mount, so real
  // prices land seconds later; blocking first paint on the serialized
  // Finnhub fan-out took 30+ seconds on a cold cache.
  // Snapshots chart and capture are live-portfolio features: skipped for demo
  // viewers and for the owner while they preview demo mode.
  const isLive = viewer.mode === "live"

  const [quotes, symbols, snapshots] = await Promise.all([
    getQuotes([...holdingSymbols, ...INDEX_SYMBOLS], { cacheOnly: true, assetClasses }),
    // Cache-only for a fast first paint; name resolution is rate-paced and runs
    // in the background below (logos render immediately regardless of names).
    getSymbols(holdingSymbols, { fetchMissing: false, assetClasses }),
    isLive ? listSnapshots(370) : Promise.resolve([]),
  ])

  // Warm the shared symbol-name cache without blocking the response.
  if (holdingSymbols.length > 0) {
    after(async () => {
      await getSymbols(holdingSymbols, { assetClasses })
    })
  }

  if (isLive && accounts.length > 0) {
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
      isOwner={isLive}
      accountCount={accounts.length}
      hiddenAccountCount={hiddenCount}
      accountTypeLabels={ACCOUNT_TYPE_LABELS}
      snapshots={snapshots}
      initialAccountId={params.account ?? null}
    />
  )
}
