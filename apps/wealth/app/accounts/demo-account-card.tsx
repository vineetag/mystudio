"use client"

import type { AccountWithHoldings } from "@/modules/accounts"
import type { SymbolInfo } from "@/modules/symbols/types"
import { SymbolBadge } from "@/components/holdings-table/symbol-badge"
import { AccountHeader, type AccountTotal } from "./account-header"

/**
 * Read-only collapsible account card for demo preview mode. No edit/delete
 * buttons, no add-holding form — demo data is managed by the seed script, and
 * the accounts page only mutates LIVE data.
 */
export function DemoAccountCard({
  account,
  symbols,
  total,
  open,
  onToggle,
}: {
  account: AccountWithHoldings
  symbols: Record<string, SymbolInfo>
  total: AccountTotal
  open: boolean
  onToggle: () => void
}) {
  const panelId = `account-panel-${account.id}`

  return (
    <div
      className={`overflow-hidden rounded-lg border ${
        open ? "border-ink/25 shadow-sm" : "border-rule"
      }`}
    >
      <AccountHeader
        account={account}
        total={total}
        open={open}
        onToggle={onToggle}
        panelId={panelId}
      />

      {open && (
        <div id={panelId} className="border-t border-rule px-3 pb-4 sm:px-4">
          <div className="mt-3 overflow-x-auto">
            {account.holdings.length === 0 ? (
              <p className="rounded-md border border-dashed border-rule p-4 text-sm text-ink/70">
                No holdings in this demo account.
              </p>
            ) : (
              <table className="w-full min-w-[24rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink/60">
                    <th className="py-2 pr-3 font-medium">Symbol</th>
                    <th className="py-2 pr-3 text-right font-medium">Quantity</th>
                    <th className="py-2 text-right font-medium">Avg cost</th>
                  </tr>
                </thead>
                <tbody>
                  {account.holdings.map((holding) => {
                    const info = symbols[holding.symbol] ?? null
                    return (
                      <tr key={holding.id} className="border-t border-rule/60">
                        <td className="py-2 pr-3">
                          <SymbolBadge
                            symbol={holding.symbol}
                            companyName={info?.name ?? null}
                            logoDomain={info?.domain ?? null}
                          />
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {holding.quantity.toLocaleString()}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {holding.avgCost === null
                            ? "—"
                            : holding.avgCost.toLocaleString(undefined, {
                                style: "currency",
                                currency: "USD",
                              })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
