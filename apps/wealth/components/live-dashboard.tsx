"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { AccountType } from "@/modules/accounts/types"
import {
  isLiabilityType,
  type BankAccount,
} from "@/modules/bank-accounts/types"
import {
  derivePositions,
  portfolioTotal,
  type DeriveAccountInput,
} from "@/modules/portfolio"
import { mergeQuoteViews, QUOTE_POLL_MS } from "@/modules/quotes/cache"
import { MARKET_INDICES } from "@/modules/quotes/indices"
import type { QuoteView } from "@/modules/quotes/types"
import type { SymbolInfo } from "@/modules/symbols/types"
import { computeChangeChips } from "@/modules/snapshots/changes"
import type { Snapshot } from "@/modules/snapshots/types"
import { BankSection } from "@/components/cash-accounts"
import {
  DashboardTabBar,
  TabPanel,
  parseTab,
  type DashboardTab,
} from "@/components/dashboard/dashboard-tabs"
import { EmptyPortfolio } from "@/components/dashboard/empty-portfolio"
import { NetWorthHero } from "@/components/dashboard/net-worth-hero"
import { OverviewTab } from "@/components/dashboard/overview-tab"
import { DashboardTables, type AccountSection } from "@/components/holdings-table/dashboard-tables"
import { PortfolioChart } from "@/components/portfolio-chart"

export type DashboardAccount = DeriveAccountInput & {
  broker: string
  brokerLogoUrl: string | null
  accountType: AccountType
}

function quotesFromRecord(record: Record<string, QuoteView>): Map<string, QuoteView> {
  return new Map(Object.entries(record))
}

export function LiveDashboard({
  accounts,
  bankAccounts,
  initialQuotes,
  symbols,
  isOwner,
  accountCount,
  hiddenAccountCount = 0,
  accountTypeLabels,
  snapshots,
  initialAccountId = null,
  simpleFinConfigured = false,
}: {
  accounts: DashboardAccount[]
  /** Cached SimpleFIN balances (visible only, already filtered server-side). */
  bankAccounts: BankAccount[]
  initialQuotes: Record<string, QuoteView>
  symbols: Record<string, SymbolInfo>
  isOwner: boolean
  accountCount: number
  /** Accounts hidden on /accounts — excluded from every figure here. */
  hiddenAccountCount?: number
  accountTypeLabels: Record<AccountType, string>
  snapshots: Snapshot[]
  /** Deep link from /accounts — opens "By account" with this section expanded. */
  initialAccountId?: string | null
  /** Lets the Cash tab's empty state distinguish "not set up" from "no data". */
  simpleFinConfigured?: boolean
}) {
  const [quotes, setQuotes] = useState(() => quotesFromRecord(initialQuotes))

  // The mode banner is also sticky (top-0, z-50) and its height varies with
  // viewport wrapping — the hero must pin just below it or the net-worth
  // number slides underneath. Track its real height instead of hardcoding.
  const [stickyTop, setStickyTop] = useState(0)
  useEffect(() => {
    const banner = document.querySelector<HTMLElement>("[data-mode-banner]")
    if (!banner) return
    const update = () => setStickyTop(banner.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(banner)
    return () => observer.disconnect()
  }, [])
  // Names + logo domains are static across the quote poll — build the map once.
  const symbolMap = useMemo(() => new Map(Object.entries(symbols)), [symbols])

  // Tab state lives in the URL. Reads go through useSearchParams (populated
  // during dynamic SSR, so /?tab=cash renders the right panel on first paint);
  // writes use the native History API because router navigation would refetch
  // the whole force-dynamic page from the server.
  const searchParams = useSearchParams()
  // ?account= deep links (no tab param) land on Investments, where the
  // expanded account section lives.
  const tab = parseTab(
    searchParams.get("tab"),
    initialAccountId ? "investments" : "overview",
  )
  const selectTab = useCallback((next: DashboardTab) => {
    const url = new URL(window.location.href)
    if (next === "overview") {
      url.searchParams.delete("tab")
    } else {
      url.searchParams.set("tab", next)
    }
    window.history.pushState(null, "", url)
    // Panels share one page scroll — land each switch at the top so a short
    // panel never opens mid-void after a deep scroll. Instant, not smooth.
    if (window.scrollY > 0) window.scrollTo({ top: 0 })
  }, [])

  const holdingSymbols = useMemo(() => {
    const unique = new Set<string>()
    for (const account of accounts) {
      for (const holding of account.holdings) {
        unique.add(holding.symbol)
      }
    }
    return [...unique].sort()
  }, [accounts])

  const holdingSymbolsKey = holdingSymbols.join(",")
  const indexSymbolsKey = MARKET_INDICES.map((index) => index.symbol).join(",")

  useEffect(() => {
    let cancelled = false

    async function pollQuotes(symbolsParam: string) {
      const params = new URLSearchParams({ symbols: symbolsParam, refresh: "1" })
      try {
        const response = await fetch(`/api/quotes?${params.toString()}`, {
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as { quotes: Record<string, QuoteView> }
        if (!cancelled) {
          setQuotes((current) => mergeQuoteViews(current, payload.quotes))
        }
      } catch {
        // Keep showing the last good prices on transient network errors.
      }
    }

    function refreshQuotes() {
      if (document.hidden) return
      // Two separate requests: indices refresh via Yahoo in under a second,
      // while the holdings batch waits out the rate-paced Finnhub queue —
      // one combined request would pin the index figures to the slow batch.
      void pollQuotes(indexSymbolsKey)
      if (holdingSymbolsKey.length > 0) void pollQuotes(holdingSymbolsKey)
    }

    refreshQuotes()
    const intervalId = window.setInterval(refreshQuotes, QUOTE_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [indexSymbolsKey, holdingSymbolsKey])

  const positions = useMemo(
    () => derivePositions(accounts, quotes, symbolMap),
    [accounts, quotes, symbolMap],
  )
  const total = useMemo(() => portfolioTotal(positions), [positions])

  // Net worth = investments + cash − owed. Liability accounts (credit cards,
  // loans) always subtract their magnitude regardless of SimpleFIN's sign
  // convention; checking vs savings stays display-only.
  const cashAccounts = useMemo(
    () => bankAccounts.filter((account) => !isLiabilityType(account.accountType)),
    [bankAccounts],
  )
  const liabilityAccounts = useMemo(
    () => bankAccounts.filter((account) => isLiabilityType(account.accountType)),
    [bankAccounts],
  )
  const cashTotal = cashAccounts.reduce((sum, account) => sum + account.balance, 0)
  const owedTotal = liabilityAccounts.reduce(
    (sum, account) => sum + Math.abs(account.balance),
    0,
  )
  const netWorth = total.value + cashTotal - owedTotal

  const chips = useMemo(() => {
    if (!isOwner) return []
    return computeChangeChips(
      total.value,
      snapshots,
      new Date().toISOString().slice(0, 10),
    )
  }, [isOwner, total.value, snapshots])

  const newestQuote = positions
    .map((position) => position.fetchedAt)
    .filter((fetchedAt): fetchedAt is string => fetchedAt !== null)
    .sort()
    .at(-1)

  const accountSections: AccountSection[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    broker: account.broker,
    brokerLogoUrl: account.brokerLogoUrl,
    typeLabel: accountTypeLabels[account.accountType],
  }))

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-8">
      <p className="pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
        One view of {accountCount} {accountCount === 1 ? "account" : "accounts"} ·{" "}
        {positions.length} positions
        {bankAccounts.length > 0 && (
          <>
            {" "}
            · {bankAccounts.length} linked{" "}
            {bankAccounts.length === 1 ? "account" : "accounts"}
          </>
        )}
        {hiddenAccountCount > 0 && (
          <span className="normal-case tracking-normal text-ink/40">
            {" "}
            · {hiddenAccountCount} hidden
          </span>
        )}
      </p>

      {/* Sticky region: the number the whole app exists to show, plus the
          tabs. z-30 clears the account filter's z-20 dropdown; -mx-4 bleeds
          the paper background to the viewport edge while scrolling. */}
      <div
        style={{ top: stickyTop }}
        className="sticky z-30 -mx-4 flex flex-col gap-3 bg-paper px-4 pt-1"
      >
        <NetWorthHero
          tab={tab}
          netWorth={netWorth}
          investmentsTotal={total.value}
          cashTotal={cashTotal}
          owedTotal={owedTotal}
          hasBankAccounts={bankAccounts.length > 0}
          newestQuote={newestQuote}
          unpricedSymbols={total.unpricedSymbols}
        />
        <DashboardTabBar active={tab} onSelect={selectTab} />
      </div>

      <TabPanel id="overview" active={tab === "overview"}>
        <OverviewTab
          hasAccounts={accounts.length > 0}
          isOwner={isOwner}
          hiddenAccountCount={hiddenAccountCount}
          chips={chips}
          projectedAnnualIncome={total.projectedAnnualIncome}
          quotes={quotes}
          snapshots={snapshots}
          positions={positions}
          cashTotal={cashTotal}
          cashCount={cashAccounts.length}
          owedTotal={owedTotal}
          owedCount={liabilityAccounts.length}
          onSelectTab={selectTab}
        />
      </TabPanel>

      <TabPanel id="investments" active={tab === "investments"}>
        {accounts.length === 0 ? (
          <EmptyPortfolio isOwner={isOwner} hiddenAccountCount={hiddenAccountCount} />
        ) : (
          <>
            <DashboardTables
              positions={positions}
              accounts={accountSections}
              canManage={isOwner}
              initialAccountId={initialAccountId}
            />
            {isOwner && <PortfolioChart snapshots={snapshots} />}
          </>
        )}
      </TabPanel>

      <TabPanel id="cash" active={tab === "cash"}>
        <BankSection
          title="Cash accounts"
          accounts={cashAccounts}
          canManage={isOwner}
          isLiability={false}
          simpleFinConfigured={simpleFinConfigured}
        />
      </TabPanel>

      <TabPanel id="liabilities" active={tab === "liabilities"}>
        <BankSection
          title="Liabilities"
          accounts={liabilityAccounts}
          canManage={isOwner}
          isLiability={true}
          simpleFinConfigured={simpleFinConfigured}
        />
      </TabPanel>
    </main>
  )
}
