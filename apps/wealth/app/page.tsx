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
import { formatAsOf, formatMoney, formatSignedPct } from "@/lib/format"

// Index widgets: Finnhub's free tier has no real index quotes, so we track
// liquid ETF proxies and label them as such — never presented as the index.
const INDEX_PROXIES = [
  { symbol: "SPY", label: "S&P 500", sub: "SPY proxy" },
  { symbol: "QQQ", label: "Nasdaq 100", sub: "QQQ proxy" },
] as const

function IndexFigure({
  label,
  sub,
  quote,
}: {
  label: string
  sub: string
  quote: QuoteView | undefined
}) {
  const change = quote?.dayChangePct ?? null
  return (
    <div className="flex items-baseline justify-between gap-4 sm:justify-end">
      <span className="text-sm text-ink/60">
        {label} <span className="text-ink/40">· {sub}</span>
      </span>
      {!quote || quote.price === null ? (
        <span className="text-sm text-ink/40">unavailable</span>
      ) : (
        <span className="text-right tabular-nums">
          <span className="font-medium">{formatMoney(quote.price)}</span>
          {change !== null && (
            <span
              className={`ml-2 text-sm ${change === 0 ? "text-ink/60" : change > 0 ? GAIN_TEXT : LOSS_TEXT}`}
            >
              {formatSignedPct(change)}
            </span>
          )}
          {quote.isStale && <span className="ml-1.5 text-xs text-amber-700">stale</span>}
        </span>
      )}
    </div>
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

  const newestQuote = positions
    .map((position) => position.fetchedAt)
    .filter((fetchedAt): fetchedAt is string => fetchedAt !== null)
    .sort()
    .at(-1)

  const accountSections = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    broker: account.broker,
    typeLabel: ACCOUNT_TYPE_LABELS[account.accountType],
  }))

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8">
      {/* The ledger sum: one figure over the double rule. */}
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
            One view of {accounts.length}{" "}
            {accounts.length === 1 ? "account" : "accounts"} ·{" "}
            {positions.length} positions
          </p>
          <p className="ledger-sum mt-2 inline-block pb-1 pr-8 font-display text-5xl font-medium tabular-nums tracking-tight">
            {formatMoney(total.value)}
          </p>
          <p className="mt-2 text-sm text-ink/60">
            {newestQuote ? formatAsOf(newestQuote) : "no prices yet"}
            {total.unpricedSymbols.length > 0 && (
              <span className="text-amber-700">
                {" "}
                · excludes {total.unpricedSymbols.join(", ")} — price unavailable
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 sm:min-w-64">
          {INDEX_PROXIES.map((proxy) => (
            <IndexFigure
              key={proxy.symbol}
              label={proxy.label}
              sub={proxy.sub}
              quote={quotes.get(proxy.symbol)}
            />
          ))}
        </div>
      </section>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-rule p-10 text-center">
          <h2 className="font-display text-xl font-medium text-ink">
            {viewer.isOwner ? "Open the ledger" : "Demo portfolio is empty"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
            {viewer.isOwner ? (
              <>
                Add your first brokerage account, then enter holdings by hand
                or import a CSV.
              </>
            ) : (
              "The demo data hasn't been seeded yet — check back soon."
            )}
          </p>
          {viewer.isOwner && (
            <Link
              href="/accounts"
              className="mt-4 inline-flex min-h-12 items-center rounded-md bg-ink px-5 text-sm font-medium text-paper"
            >
              Add first account
            </Link>
          )}
        </div>
      ) : (
        <DashboardTables consolidated={consolidated} accounts={accountSections} />
      )}
    </main>
  )
}
