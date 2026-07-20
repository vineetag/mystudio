"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight } from "lucide-react"
import { consolidate, type PositionRow } from "@/modules/portfolio"
import { BrokerLogo } from "@/components/broker-logo"
import { AddHoldingForm } from "@/components/manage-holdings/add-holding-form"
import { formatMoney } from "@/lib/format"
import {
  ConsolidatedTable,
  PositionsTable,
  type AccountBrokerMeta,
} from "./holdings-table"
import {
  DEFAULT_SORT,
  SORTABLE_COLUMNS,
  type SortState,
} from "./columns"
import { matchesTokens } from "./fuzzy"

export interface AccountSection {
  id: string
  name: string
  broker: string
  brokerLogoUrl: string | null
  typeLabel: string
}

/** Priced value + holding count for one account, from the raw positions. */
interface AccountTotal {
  value: number
  holdingCount: number
  unpricedCount: number
}

/** Next sort state when a column header (or the mobile menu) is chosen. */
function nextSort(current: SortState, key: string): SortState {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" }
  }
  // Symbol reads best A→Z; every numeric column reads best largest-first.
  return { key, dir: key === "symbol" ? "asc" : "desc" }
}

/**
 * Account filter + sort + search over both P0 views: consolidated per-ticker
 * (hero, expandable) and per-account tables. Everything is derived from the raw
 * positions so the account filter recomputes real totals, not just row
 * visibility. Sorting is column-driven; search filters by symbol, company/fund
 * name, account, or broker.
 */
export function DashboardTables({
  positions,
  accounts,
  canManage = false,
  initialAccountId = null,
}: {
  positions: PositionRow[]
  accounts: AccountSection[]
  /** Owner in LIVE mode — per-account panels gain edit/delete/add controls. */
  canManage?: boolean
  /** Deep link (/?account=id): land on "By account" with this section open. */
  initialAccountId?: string | null
}) {
  // Only honor a deep link that names a real account.
  const linkedAccountId =
    initialAccountId && accounts.some((account) => account.id === initialAccountId)
      ? initialAccountId
      : null
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  // Empty = all accounts (the default). A non-empty set is an explicit filter.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Which view is showing. Consolidated ("all") is the landing view; "By
  // account" is a tab so the two data renderings never stack and double scroll.
  const [view, setView] = useState<"all" | "accounts">(
    linkedAccountId ? "accounts" : "all",
  )
  // Accounts expanded in the "By account" view — collapsed by default so the
  // page opens as a scannable account list, not N full tables.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(linkedAccountId ? [linkedAccountId] : []),
  )

  const needle = query.trim().toLowerCase()
  const tokens = useMemo(() => needle.split(/\s+/).filter(Boolean), [needle])

  // Checkbox semantics: unchecking one account from "all" keeps the rest
  // selected. Selecting every account (or none) collapses back to "all".
  function toggleAccount(id: string) {
    setSelected((current) => {
      const effective =
        current.size === 0
          ? new Set(accounts.map((account) => account.id))
          : new Set(current)
      if (effective.has(id)) effective.delete(id)
      else effective.add(id)
      if (effective.size === 0 || effective.size === accounts.length) {
        return new Set<string>()
      }
      return effective
    })
  }

  function handleSort(key: string) {
    setSort((current) => nextSort(current, key))
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isAllAccounts = selected.size === 0

  // True per-account totals — computed from ALL positions so the numbers don't
  // shift when the search box or account filter narrows the view.
  const accountTotals = useMemo(() => {
    const totals = new Map<string, AccountTotal>()
    for (const position of positions) {
      const entry = totals.get(position.accountId) ?? {
        value: 0,
        holdingCount: 0,
        unpricedCount: 0,
      }
      entry.holdingCount += 1
      if (position.value === null) entry.unpricedCount += 1
      else entry.value += position.value
      totals.set(position.accountId, entry)
    }
    return totals
  }, [positions])

  // Positions limited to the chosen accounts — the basis for every view below.
  const activePositions = useMemo(
    () =>
      positions.filter(
        (position) => selected.size === 0 || selected.has(position.accountId),
      ),
    [positions, selected],
  )

  const consolidated = useMemo(() => consolidate(activePositions), [activePositions])

  // Broker identity per account id — lets the consolidated breakdown show each
  // account's logo without threading broker fields through PositionRow.
  const accountMeta = useMemo(() => {
    const map = new Map<string, AccountBrokerMeta>()
    for (const account of accounts) {
      map.set(account.id, {
        broker: account.broker,
        brokerLogoUrl: account.brokerLogoUrl,
      })
    }
    return map
  }, [accounts])

  const filteredConsolidated = useMemo(() => {
    if (tokens.length === 0) return consolidated
    return consolidated.filter((row) =>
      matchesTokens(tokens, [
        row.symbol,
        row.companyName,
        ...row.positions.flatMap((position) => [
          position.accountName,
          accountMeta.get(position.accountId)?.broker ?? null,
        ]),
      ]),
    )
  }, [accountMeta, consolidated, tokens])

  const accountSections = useMemo(() => {
    return accounts
      .filter((account) => selected.size === 0 || selected.has(account.id))
      .map((account) => {
        const accountPositions = activePositions
          .filter((position) => position.accountId === account.id)
          .filter(
            (position) =>
              tokens.length === 0 ||
              matchesTokens(tokens, [
                position.symbol,
                position.companyName,
                account.name,
                account.broker,
              ]),
          )
        return { account, positions: accountPositions }
      })
      // In manage mode a holding-less account must stay visible so its first
      // holding can be added — but not while a search is narrowing the view.
      .filter(
        (section) => section.positions.length > 0 || (canManage && !needle),
      )
  }, [accounts, activePositions, canManage, needle, selected, tokens])

  const activeSortColumn = SORTABLE_COLUMNS.find((column) => column.key === sort.key)

  // "By account" only earns a tab when there's more than one account — except
  // in manage mode, where it's the only surface with edit/add controls.
  const showAccountsTab = accounts.length > 1 || canManage
  const activeView = showAccountsTab ? view : "all"
  // A live search reveals matches under every collapsed header automatically.
  const effectiveExpanded = needle
    ? new Set(accountSections.map((section) => section.account.id))
    : expanded

  const allExpanded =
    accountSections.length > 0 &&
    accountSections.every((section) => effectiveExpanded.has(section.account.id))

  function toggleExpandAll() {
    setExpanded(
      allExpanded
        ? new Set<string>()
        : new Set(accountSections.map((section) => section.account.id)),
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Account filter — multi-select dropdown. Hidden with one account. */}
          {accounts.length > 1 && (
            <AccountFilter
              accounts={accounts}
              totals={accountTotals}
              selected={selected}
              onToggle={toggleAccount}
              onSelectAll={() => setSelected(new Set())}
            />
          )}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search symbol, name, or account…"
            aria-label="Search holdings"
            className="min-h-12 w-full rounded-md border border-rule px-4 text-base outline-none focus:border-moss sm:w-72"
          />
        </div>

        {/* Mobile sort control — the desktop tables sort via their headers. */}
        <div className="flex items-center gap-2 md:hidden">
          <label htmlFor="sort-by" className="text-sm text-ink/60">
            Sort
          </label>
          <select
            id="sort-by"
            value={sort.key}
            onChange={(event) => setSort((current) => ({ key: event.target.value, dir: current.dir }))}
            className="min-h-12 rounded-md border border-rule bg-paper px-3 text-base outline-none focus:border-moss"
          >
            {SORTABLE_COLUMNS.map((column) => (
              <option key={column.key} value={column.key}>
                {column.header}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              setSort((current) => ({
                ...current,
                dir: current.dir === "asc" ? "desc" : "asc",
              }))
            }
            aria-label={`Sort ${sort.dir === "asc" ? "descending" : "ascending"}`}
            className="flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-md border border-rule text-ink/70"
          >
            {sort.dir === "asc" ? (
              <ArrowUp className="h-4 w-4" aria-hidden />
            ) : (
              <ArrowDown className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {showAccountsTab && (
        <div role="tablist" aria-label="Holdings view" className="flex gap-1 border-b border-rule">
          <ViewTab
            id="all"
            label="All holdings"
            active={activeView === "all"}
            onSelect={() => setView("all")}
          />
          <ViewTab
            id="accounts"
            label="By account"
            active={activeView === "accounts"}
            onSelect={() => setView("accounts")}
          />
        </div>
      )}

      {activeView === "all" && (
        <section role="tabpanel" id="panel-all" aria-labelledby="tab-all">
          <h2 className="mb-2 font-display text-xl font-medium text-ink">All holdings</h2>
          <p className="mb-3 text-sm text-ink/70">
            One row per ticker
            {isAllAccounts ? " across every account" : " across the selected accounts"} —
            expand a row for the per-account breakdown.
          </p>
          {filteredConsolidated.length === 0 ? (
            <p className="rounded-md border border-dashed border-rule p-6 text-sm text-ink/70">
              {needle
                ? `Nothing matches "${query}".`
                : "No holdings match this filter."}
            </p>
          ) : (
            <ConsolidatedTable
              rows={filteredConsolidated}
              accountMeta={accountMeta}
              sort={sort}
              onSort={handleSort}
            />
          )}
          <p className="mt-2 text-xs text-ink/40 md:hidden">
            Sorted by {activeSortColumn?.header ?? "Value"} ({sort.dir === "asc" ? "ascending" : "descending"}).
          </p>
        </section>
      )}

      {activeView === "accounts" && (
        <section role="tabpanel" id="panel-accounts" aria-labelledby="tab-accounts" className="flex flex-col gap-4">
          {accountSections.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink/60">
                {accountSections.length}{" "}
                {accountSections.length === 1 ? "account" : "accounts"}
              </p>
              {/* Hidden while searching — a live search already expands every match. */}
              {!needle && (
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-md border border-rule px-4 text-sm font-medium text-ink/70 transition-colors hover:border-ink/30 hover:text-ink"
                >
                  {allExpanded ? (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  )}
                  {allExpanded ? "Collapse all" : "Expand all"}
                </button>
              )}
            </div>
          )}
          {accountSections.length === 0 ? (
            <p className="rounded-md border border-dashed border-rule p-6 text-sm text-ink/70">
              {needle ? `Nothing matches "${query}".` : "No holdings match this filter."}
            </p>
          ) : (
            accountSections.map(({ account, positions: accountPositions }) => {
              const total = accountTotals.get(account.id) ?? {
                value: 0,
                holdingCount: 0,
                unpricedCount: 0,
              }
              const isOpen = effectiveExpanded.has(account.id)
              const panelId = `account-panel-${account.id}`
              return (
                <div
                  key={account.id}
                  className={`overflow-hidden rounded-lg border ${
                    isOpen ? "border-ink/25 shadow-sm" : "border-rule"
                  }`}
                >
                  {/* Tinted header keeps each account identifiable when every
                      section is open and the page gets long. */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(account.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className={`flex min-h-12 w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors sm:px-4 ${
                      isOpen ? "bg-ink/[0.05]" : "bg-ink/[0.02] hover:bg-ink/[0.05]"
                    }`}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-ink/50" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink/50" aria-hidden />
                    )}
                    <BrokerLogo broker={account.broker} logoUrl={account.brokerLogoUrl} size={28} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium leading-tight text-ink">{account.name}</h3>
                      <p className="truncate text-sm text-ink/60">
                        {account.broker} · {account.typeLabel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums text-ink">
                        {formatMoney(total.value)}
                      </p>
                      <p className="text-xs text-ink/50">
                        {total.holdingCount}{" "}
                        {total.holdingCount === 1 ? "holding" : "holdings"}
                        {total.unpricedCount > 0 && (
                          <span className="text-amber-700">
                            {" "}
                            · {total.unpricedCount} unpriced
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                  {isOpen && (
                    <div id={panelId} className="border-t border-rule px-3 pb-3 pt-1 sm:px-4">
                      {accountPositions.length > 0 ? (
                        <PositionsTable
                          positions={accountPositions}
                          sort={sort}
                          onSort={handleSort}
                          canManage={canManage}
                        />
                      ) : (
                        <p className="mt-2 rounded-md border border-dashed border-rule p-4 text-sm text-ink/70">
                          No holdings yet — add the first one below or import a
                          CSV from the accounts page.
                        </p>
                      )}
                      {canManage && (
                        <div className="mt-3">
                          <AddHoldingForm accountId={account.id} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </section>
      )}
    </div>
  )
}

/** One tab in the view switcher — moss underline marks the active panel. */
function ViewTab({
  id,
  label,
  active,
  onSelect,
}: {
  id: string
  label: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onSelect}
      className={`-mb-px flex min-h-12 cursor-pointer items-center border-b-2 px-3 text-sm font-medium transition-colors sm:px-4 ${
        active
          ? "border-moss text-moss"
          : "border-transparent text-ink/60 hover:text-ink"
      }`}
    >
      {label}
    </button>
  )
}

/**
 * Compact multi-select account filter. Stays one button wide no matter how
 * many accounts are connected; the panel lists each account with its total so
 * the filter doubles as an account summary.
 */
function AccountFilter({
  accounts,
  totals,
  selected,
  onToggle,
  onSelectAll,
}: {
  accounts: AccountSection[]
  totals: Map<string, AccountTotal>
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const isAllAccounts = selected.size === 0

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const label = isAllAccounts
    ? `All accounts (${accounts.length})`
    : `${selected.size} of ${accounts.length} accounts`

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-4 text-sm transition-colors sm:w-auto sm:min-w-52 ${
          isAllAccounts
            ? "border-rule text-ink/80 hover:border-ink/30"
            : "border-moss bg-moss/10 font-medium text-moss"
        }`}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          aria-label="Filter by account"
          className="absolute left-0 top-full z-20 mt-2 max-h-96 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-rule bg-paper py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={isAllAccounts}
            onClick={onSelectAll}
            className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 text-sm hover:bg-ink/[0.04]"
          >
            <span className={isAllAccounts ? "font-medium text-moss" : "text-ink"}>
              All accounts
            </span>
            {isAllAccounts && <Check className="h-4 w-4 shrink-0 text-moss" aria-hidden />}
          </button>
          <div className="mx-4 my-1 border-t border-rule/60" />
          {accounts.map((account) => {
            const checked = isAllAccounts || selected.has(account.id)
            const total = totals.get(account.id)
            return (
              <button
                key={account.id}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => onToggle(account.id)}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm hover:bg-ink/[0.04]"
              >
                <span
                  aria-hidden
                  className={`flex shrink-0 items-center justify-center rounded border ${
                    checked ? "border-moss bg-moss text-paper" : "border-rule bg-white"
                  }`}
                  style={{ width: 18, height: 18 }}
                >
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <BrokerLogo broker={account.broker} logoUrl={account.brokerLogoUrl} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate leading-tight text-ink">{account.name}</span>
                  <span className="block truncate text-xs text-ink/50">{account.broker}</span>
                </span>
                {total && (
                  <span className="shrink-0 tabular-nums text-ink/70">
                    {formatMoney(total.value)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
