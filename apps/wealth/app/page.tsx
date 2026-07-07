import Link from "next/link"
import {
  ACCOUNT_TYPE_LABELS,
  listViewerAccountsWithHoldings,
} from "@/modules/accounts"
import { getViewer } from "@/modules/auth"
import { consolidate, derivePositions, portfolioTotal } from "@/modules/portfolio"
import { getQuotes, type QuoteView } from "@/modules/quotes"
import { DashboardTables } from "@/components/holdings-table/dashboard-tables"
import { GAIN_TEXT, LOSS_TEXT } from "@/components/holdings-table/columns"
import { StatCard } from "@/components/stat-card"
import { formatAsOf, formatMoney, formatSignedPct } from "@/lib/format"

// Index widgets: Finnhub's free tier has no real index quotes, so we track
// liquid ETF proxies and label them as such — never presented as the index.
const INDEX_PROXIES = [
  { symbol: "SPY", label: "S&P 500 — SPY proxy" },
  { symbol: "QQQ", label: "Nasdaq 100 — QQQ proxy" },
] as const

function IndexCard({ label, quote }: { label: string; quote: QuoteView | undefined }) {
  if (!quote || quote.price === null) {
    return (
      <StatCard
        label={label}
        primary={<span className="text-neutral-400">unavailable</span>}
      />
    )
  }
  const change = quote.dayChangePct
  return (
    <StatCard
      label={label}
      primary={formatMoney(quote.price)}
      secondary={
        <>
          {change !== null && (
            <span className={change === 0 ? "text-neutral-600" : change > 0 ? GAIN_TEXT : LOSS_TEXT}>
              {formatSignedPct(change)} today
            </span>
          )}
          <span className="ml-2 text-neutral-400">
            {quote.fetchedAt && formatAsOf(quote.fetchedAt)}
            {quote.isStale && " · stale"}
          </span>
        </>
      }
    />
  )
}

export default async function DashboardPage() {
  const [viewer, accounts] = await Promise.all([
    getViewer(),
    listViewerAccountsWithHoldings(),
  ])

  const holdingSymbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )
  const quotes = await getQuotes([
    ...holdingSymbols,
    ...INDEX_PROXIES.map((proxy) => proxy.symbol),
  ])

  const positions = derivePositions(accounts, quotes)
  const consolidated = consolidate(positions)
  const total = portfolioTotal(positions)

  const accountSections = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    broker: account.broker,
    typeLabel: ACCOUNT_TYPE_LABELS[account.accountType],
  }))

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total portfolio value"
          primary={formatMoney(total.value)}
          secondary={
            total.unpricedSymbols.length > 0 ? (
              <span className="text-amber-700">
                excludes {total.unpricedSymbols.join(", ")} — price unavailable
              </span>
            ) : undefined
          }
        />
        {INDEX_PROXIES.map((proxy) => (
          <IndexCard
            key={proxy.symbol}
            label={proxy.label}
            quote={quotes.get(proxy.symbol)}
          />
        ))}
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center">
          <h2 className="text-lg font-semibold text-neutral-900">
            {viewer.isOwner ? "Start your portfolio" : "Demo portfolio is empty"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
            {viewer.isOwner ? (
              <>
                Add your first brokerage account, then holdings by hand or CSV.{" "}
                <Link href="/accounts" className="underline">
                  Go to Accounts
                </Link>
              </>
            ) : (
              "The demo data hasn't been seeded yet — check back soon."
            )}
          </p>
        </div>
      ) : (
        <DashboardTables consolidated={consolidated} accounts={accountSections} />
      )}
    </main>
  )
}
