import { after } from "next/server"
import { redirect } from "next/navigation"
import { listOwnerAccountsWithHoldings } from "@/modules/accounts"
import { requireOwner } from "@/modules/auth"
import { isSnapTradeConfigured, listConnections } from "@/modules/snaptrade"
import { getOrRegisterStUser, syncSnapTradeHoldings } from "@/modules/snaptrade"
import { getSymbols } from "@/modules/symbols"
import { AccountCard } from "./account-card"
import { AccountForm } from "./account-form"
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

  const snapTradeEnabled = isSnapTradeConfigured()
  const [accounts, connections] = await Promise.all([
    listOwnerAccountsWithHoldings(),
    snapTradeEnabled ? listConnections() : Promise.resolve([]),
  ])

  // Names + logos for every held symbol, so each row shows the company and the
  // owner can add a name to funds Finnhub can't resolve. Cache-only read here;
  // resolution is rate-paced and warmed in the background below.
  const symbolSymbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )
  const symbols = Object.fromEntries(
    await getSymbols(symbolSymbols, { fetchMissing: false }),
  )
  if (symbolSymbols.length > 0) {
    after(async () => {
      await getSymbols(symbolSymbols)
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">Accounts</h1>
        <p className="mt-1 text-sm text-ink/70">
          Manage brokerage accounts and their holdings. LIVE data.
        </p>
      </div>

      {snapTradeEnabled && <ConnectedBrokerages connections={connections} />}

      <section className="rounded-lg border border-rule p-4">
        <h2 className="mb-3 text-lg font-semibold text-ink">New account</h2>
        <AccountForm />
      </section>

      <CsvImport />

      {accounts.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule p-6 text-sm text-ink/70">
          No accounts yet. Add your first account above — holdings and CSV
          import unlock once an account exists.
        </p>
      ) : (
        accounts.map((account) => (
          <AccountCard key={account.id} account={account} symbols={symbols} />
        ))
      )}
    </main>
  )
}
