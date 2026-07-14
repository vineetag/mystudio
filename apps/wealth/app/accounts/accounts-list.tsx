"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { AccountWithHoldings } from "@/modules/accounts"
import type { SymbolInfo } from "@/modules/symbols/types"
import { AccountCard } from "./account-card"
import { DemoAccountCard } from "./demo-account-card"
import type { AccountTotal } from "./account-header"

/**
 * Collapsible account list — mirrors the dashboard's "By account" tab so the
 * page opens as a scannable account summary, not N full holdings tables.
 * A single account starts expanded; with more, everything starts collapsed.
 */
export function AccountsList({
  accounts,
  symbols,
  totals,
  readOnly,
}: {
  accounts: AccountWithHoldings[]
  symbols: Record<string, SymbolInfo>
  totals: Record<string, AccountTotal>
  readOnly: boolean
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    accounts.length === 1 ? new Set([accounts[0].id]) : new Set(),
  )

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allExpanded =
    accounts.length > 0 && accounts.every((account) => expanded.has(account.id))

  function toggleExpandAll() {
    setExpanded(
      allExpanded
        ? new Set<string>()
        : new Set(accounts.map((account) => account.id)),
    )
  }

  const fallbackTotal: AccountTotal = { value: 0, holdingCount: 0, unpricedCount: 0 }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </p>
        {accounts.length > 1 && (
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

      {accounts.map((account) => {
        const shared = {
          account,
          symbols,
          total: totals[account.id] ?? fallbackTotal,
          open: expanded.has(account.id),
          onToggle: () => toggleExpanded(account.id),
        }
        return readOnly ? (
          <DemoAccountCard key={account.id} {...shared} />
        ) : (
          <AccountCard key={account.id} {...shared} />
        )
      })}
    </section>
  )
}
