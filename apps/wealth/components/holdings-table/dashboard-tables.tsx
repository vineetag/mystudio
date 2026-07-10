"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { consolidate, type PositionRow } from "@/modules/portfolio"
import { BrokerLogo } from "@/components/broker-logo"
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

  function toggleAccount(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSort(key: string) {
    setSort((current) => nextSort(current, key))
  }

  const isAllAccounts = selected.size === 0

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
      <div className="flex flex-col gap-4">
        {/* Account filter — toggle chips. Hidden when there's only one account. */}
        {accounts.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
              Accounts
            </span>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All"
                active={isAllAccounts}
                onClick={() => setSelected(new Set())}
              />
              {accounts.map((account) => (
                <FilterChip
                  key={account.id}
                  label={account.name}
                  active={!isAllAccounts && selected.has(account.id)}
                  onClick={() => toggleAccount(account.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by symbol or account…"
            aria-label="Filter holdings"
            className="min-h-12 w-full max-w-sm rounded-md border border-rule px-4 text-base outline-none focus:border-moss"
          />

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
          {accountSections.map(({ account, positions: accountPositions }) => (
            <div key={account.id}>
              <div className="mb-2 flex items-center gap-2.5">
                <BrokerLogo broker={account.broker} logoUrl={account.brokerLogoUrl} size={28} />
                <div>
                  <h3 className="font-medium leading-tight text-ink">{account.name}</h3>
                  <p className="text-sm text-ink/60">
                    {account.broker} · {account.typeLabel}
                  </p>
                </div>
              </div>
              <PositionsTable positions={accountPositions} sort={sort} onSort={handleSort} />
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors ${
        active
          ? "border-moss bg-moss/10 font-medium text-moss"
          : "border-rule text-ink/70 hover:border-ink/30 hover:text-ink"
      }`}
    >
      {label}
    </button>
  )
}
