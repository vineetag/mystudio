import { after } from "next/server"
import {
  ACCOUNT_TYPE_LABELS,
  listViewerAccountsWithHoldings,
} from "@/modules/accounts"
import { getViewer } from "@/modules/auth"
import { getQuotes } from "@/modules/quotes"
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

  const [quotes, snapshots] = await Promise.all([
    getQuotes([...holdingSymbols, ...INDEX_PROXIES], { forceRefresh: true }),
    viewer.isOwner ? listSnapshots(370) : Promise.resolve([]),
  ])

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
      isOwner={viewer.isOwner}
      accountCount={accounts.length}
      accountTypeLabels={ACCOUNT_TYPE_LABELS}
      snapshots={snapshots}
    />
  )
}
