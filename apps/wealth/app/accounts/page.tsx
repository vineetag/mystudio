import { listOwnerAccountsWithHoldings } from "@/modules/accounts"
import { AccountCard } from "./account-card"
import { AccountForm } from "./account-form"
import { CsvImport } from "./csv-import"

// Owner-only (enforced in middleware). Minimal M2 page — design pass is M5.
export default async function AccountsPage() {
  const accounts = await listOwnerAccountsWithHoldings()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">Accounts</h1>
        <p className="mt-1 text-sm text-ink/70">
          Manage brokerage accounts and their holdings. LIVE data.
        </p>
      </div>

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
        accounts.map((account) => <AccountCard key={account.id} account={account} />)
      )}
    </main>
  )
}
