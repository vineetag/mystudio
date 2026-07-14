"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import type { Account } from "@/modules/accounts"
import { ACCOUNT_TYPE_LABELS } from "@/modules/accounts/labels"
import { BrokerLogo } from "@/components/broker-logo"
import { formatMoney } from "@/lib/format"

/** Priced value + holding count for one account, computed server-side. */
export interface AccountTotal {
  value: number
  holdingCount: number
  unpricedCount: number
}

/**
 * Account header — same visual language as the dashboard's "By account"
 * tab so the two pages read as one system: chevron, broker logo, name,
 * broker · type on the left; priced total + holding count on the right.
 * Without onToggle it renders as a static row (demo preview cards).
 */
export function AccountHeader({
  account,
  total,
  open = false,
  onToggle,
  panelId,
}: {
  account: Account
  total: AccountTotal
  open?: boolean
  onToggle?: () => void
  panelId?: string
}) {
  const content = (
    <>
      {onToggle &&
        (open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink/50" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-ink/50" aria-hidden />
        ))}
      <BrokerLogo broker={account.broker} logoUrl={account.brokerLogoUrl} size={28} />
      <div className={`min-w-0 flex-1 ${account.hidden ? "opacity-60" : ""}`}>
        <h2 className="truncate font-medium leading-tight text-ink">
          {account.name}
          {account.source === "snaptrade" && (
            <span className="ml-2 rounded bg-moss/10 px-1.5 py-0.5 align-middle text-xs font-medium text-moss">
              via SnapTrade
            </span>
          )}
          {account.hidden && (
            <span className="ml-2 rounded bg-ink/10 px-1.5 py-0.5 align-middle text-xs font-medium text-ink/60">
              Hidden
            </span>
          )}
        </h2>
        <p className="truncate text-sm text-ink/60">
          {account.broker} · {ACCOUNT_TYPE_LABELS[account.accountType]}
        </p>
      </div>
      <div className={`shrink-0 text-right ${account.hidden ? "opacity-60" : ""}`}>
        <p className="font-medium tabular-nums text-ink">
          {formatMoney(total.value)}
        </p>
        <p className="text-xs text-ink/50">
          {total.holdingCount} {total.holdingCount === 1 ? "holding" : "holdings"}
          {total.unpricedCount > 0 && (
            <span className="text-amber-700"> · {total.unpricedCount} unpriced</span>
          )}
        </p>
      </div>
    </>
  )

  if (!onToggle) {
    return (
      <div className="flex min-h-12 w-full items-center gap-3 bg-ink/[0.02] px-3 py-3 text-left sm:px-4">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={panelId}
      className={`flex min-h-12 w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors sm:px-4 ${
        open ? "bg-ink/[0.05]" : "bg-ink/[0.02] hover:bg-ink/[0.05]"
      }`}
    >
      {content}
    </button>
  )
}
