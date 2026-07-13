"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Check, ChevronDown } from "lucide-react"
import { consolidate, type PositionRow } from "@/modules/portfolio"
import { BrokerLogo } from "@/components/broker-logo"
import { formatMoney } from "@/lib/format"
import { ConsolidatedTable, PositionsTable } from "./holdings-table"
import {
  DEFAULT_SORT,
  SORTABLE_COLUMNS,
  type SortState,
} from "./columns"

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
 * visibility. Sorting is column-driven; search filters by symbol or account.
 */
export function DashboardTables({
  positions,
  accounts,
}: {
  positions: PositionRow[]
  accounts: AccountSection[]
}) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  // Empty = all accounts (the default). A non-empty set is an explicit filter.
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const needle = query.trim().toLowerCase()

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

  const filteredConsolidated = useMemo(() => {
    if (!needle) return consolidated
    return consolidated.filter(
      (row) =>
        row.symbol.toLowerCase().includes(needle) ||
        row.positions.some((position) =>
          position.accountName.toLowerCase().includes(needle),
        ),
    )
  }, [consolidated, needle])

  const accountSections = useMemo(() => {
    return accounts
      .filter((account) => selected.size === 0 || selected.has(account.id))
      .map((account) => {
        const accountPositions = activePositions
          .filter((position) => position.accountId === account.id)
          .filter(
            (position) =>
              !needle ||
              account.name.toLowerCase().includes(needle) ||
              position.symbol.toLowerCase().includes(needle),
          )
        return { account, positions: accountPositions }
      })
      .filter((section) => section.positions.length > 0)
  }, [accounts, activePositions, needle, selected])

  const activeSortColumn = SORTABLE_COLUMNS.find((column) => column.key === sort.key)

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
            placeholder="Filter by symbol or account…"
            aria-label="Filter holdings"
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

      <section>
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
          <ConsolidatedTable rows={filteredConsolidated} sort={sort} onSort={handleSort} />
        )}
        <p className="mt-2 text-xs text-ink/40 md:hidden">
          Sorted by {activeSortColumn?.header ?? "Value"} ({sort.dir === "asc" ? "ascending" : "descending"}).
        </p>
      </section>

      {accountSections.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="font-display text-xl font-medium text-ink">By account</h2>
          {accountSections.map(({ account, positions: accountPositions }) => {
            const total = accountTotals.get(account.id)
            return (
              <div key={account.id}>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <BrokerLogo broker={account.broker} logoUrl={account.brokerLogoUrl} size={28} />
                    <div>
                      <h3 className="font-medium leading-tight text-ink">{account.name}</h3>
                      <p className="text-sm text-ink/60">
                        {account.broker} · {account.typeLabel}
                      </p>
                    </div>
                  </div>
                  {total && (
                    <div className="text-right">
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
                  )}
                </div>
                <PositionsTable positions={accountPositions} sort={sort} onSort={handleSort} />
              </div>
            )
          })}
        </section>
      )}
    </div>
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
