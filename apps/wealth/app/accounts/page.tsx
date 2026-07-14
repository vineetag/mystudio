import { redirect } from "next/navigation"
import {
  listOwnerAccountsWithHoldings,
  listViewerAccountsWithHoldings,
} from "@/modules/accounts"
import { assetClassMapFromAccounts } from "@/modules/holdings"
import { getViewer, requireOwner } from "@/modules/auth"
import { derivePositions } from "@/modules/portfolio"
import { getQuotes } from "@/modules/quotes"
import { isSnapTradeConfigured, listConnections } from "@/modules/snaptrade"
import { getOrRegisterStUser, syncSnapTradeHoldings } from "@/modules/snaptrade"
import { AccountForm } from "./account-form"
import { AccountsList } from "./accounts-list"
import type { AccountTotal } from "./account-header"
import { ConnectedBrokerages } from "./connected-brokerages"
import { CsvImport } from "./csv-import"

// Owner-only (enforced in middleware). Minimal M2 page — design pass is M5.
export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ snaptrade?: string }>
}) {
  // Returning from the SnapTrade connection portal: pull positions right
  // away, then land on a clean URL so a refresh doesn't re-sync.
  const params = await searchParams
  if (params.snaptrade === "connected" && isSnapTradeConfigured()) {
    const owner = await requireOwner()
    if (owner.ok) {
      try {
        const stUser = await getOrRegisterStUser(owner.userId)
        await syncSnapTradeHoldings(owner.userId, stUser)
      } catch (error) {
        // Sync errors land on the connection rows; the page still renders.
        console.error("SnapTrade post-connect sync failed:", error)
      }
    }
    redirect("/accounts")
  }

  // Demo preview (owner toggled the demo view) must never show live data —
  // load the demo portfolio read-only and skip live-only sections entirely.
  const viewer = await getViewer()
  const demoPreview = viewer.mode === "demo"

  const snapTradeEnabled = isSnapTradeConfigured() && !demoPreview
  const [accounts, connections] = await Promise.all([
    demoPreview
      ? listViewerAccountsWithHoldings()
      : listOwnerAccountsWithHoldings(),
    snapTradeEnabled ? listConnections() : Promise.resolve([]),
  ])

  // Cached quotes (never a Finnhub call) price each account's header total so
  // the list scans like the dashboard's "By account" tab.
  const heldSymbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )
  const assetClasses = assetClassMapFromAccounts(accounts)
  const quotes = await getQuotes(heldSymbols, { cacheOnly: true, assetClasses })

  const totals: Record<string, AccountTotal> = {}
  for (const account of accounts) {
    totals[account.id] = { value: 0, holdingCount: 0, unpricedCount: 0 }
  }
  for (const position of derivePositions(accounts, quotes)) {
    const entry = totals[position.accountId]
    entry.holdingCount += 1
    if (position.value === null) entry.unpricedCount += 1
    else entry.value += position.value
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">Accounts</h1>
        <p className="mt-1 text-sm text-ink/70">
          {demoPreview
            ? "Demo preview — sample accounts with dummy data."
            : "Manage brokerage accounts and their holdings. LIVE data."}
        </p>
      </div>

      {demoPreview && (
        <p className="rounded-md border border-rule bg-moss/5 p-3 text-sm text-ink/70">
          You&apos;re previewing demo mode, so this page shows the read-only
          demo portfolio. Switch back to LIVE mode to manage your real
          accounts, holdings, and brokerage connections.
        </p>
      )}

      {snapTradeEnabled && <ConnectedBrokerages connections={connections} />}

      {!demoPreview && (
        <>
          <section className="rounded-lg border border-rule p-4">
            <h2 className="mb-3 text-lg font-semibold text-ink">New account</h2>
            <AccountForm />
          </section>

          <CsvImport />
        </>
      )}

      {accounts.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule p-6 text-sm text-ink/70">
          {demoPreview
            ? "The demo portfolio has no accounts yet."
            : "No accounts yet. Add your first account above — holdings and CSV import unlock once an account exists."}
        </p>
      ) : (
        <AccountsList
          accounts={accounts}
          totals={totals}
          readOnly={demoPreview}
        />
      )}
    </main>
  )
}
