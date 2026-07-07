"use client"

import { useMemo, useState } from "react"
import type { ConsolidatedRow } from "@/modules/portfolio"
import { ConsolidatedTable, PositionsTable } from "./holdings-table"

export interface AccountSection {
  id: string
  name: string
  broker: string
  typeLabel: string
}

/**
 * Search + the two P0 views: consolidated per-ticker (hero, expandable) and
 * per-account tables. One search box filters both by symbol or account name.
 */
export function DashboardTables({
  consolidated,
  accounts,
}: {
  consolidated: ConsolidatedRow[]
  accounts: AccountSection[]
}) {
  const [query, setQuery] = useState("")
  const needle = query.trim().toLowerCase()

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
    const allPositions = consolidated.flatMap((row) => row.positions)
    return accounts
      .map((account) => {
        const positions = allPositions
          .filter((position) => position.accountId === account.id)
          .filter(
            (position) =>
              !needle ||
              account.name.toLowerCase().includes(needle) ||
              position.symbol.toLowerCase().includes(needle),
          )
          .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
        return { account, positions }
      })
      .filter((section) => section.positions.length > 0)
  }, [accounts, consolidated, needle])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by symbol or account…"
          aria-label="Filter holdings"
          className="min-h-12 w-full max-w-sm rounded-md border border-rule px-4 text-base outline-none focus:border-moss"
        />
      </div>

      <section>
        <h2 className="mb-2 font-display text-xl font-medium text-ink">All holdings</h2>
        <p className="mb-3 text-sm text-ink/70">
          One row per ticker across every account — expand a row for the
          per-account breakdown.
        </p>
        {filteredConsolidated.length === 0 ? (
          <p className="rounded-md border border-dashed border-rule p-6 text-sm text-ink/70">
            {needle
              ? `Nothing matches "${query}".`
              : "No holdings yet."}
          </p>
        ) : (
          <ConsolidatedTable rows={filteredConsolidated} />
        )}
      </section>

      {accountSections.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="font-display text-xl font-medium text-ink">By account</h2>
          {accountSections.map(({ account, positions }) => (
            <div key={account.id}>
              <h3 className="mb-1 font-medium text-ink">{account.name}</h3>
              <p className="mb-2 text-sm text-ink/60">
                {account.broker} · {account.typeLabel}
              </p>
              <PositionsTable positions={positions} />
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
