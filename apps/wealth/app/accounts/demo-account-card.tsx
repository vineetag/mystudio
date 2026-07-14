import type { AccountWithHoldings } from "@/modules/accounts"
import { AccountHeader, type AccountTotal } from "./account-header"

/**
 * Read-only summary row for demo preview mode — header only, no panel.
 * Demo holdings are viewable on the dashboard's demo "By account" tab,
 * and the accounts page only mutates LIVE data.
 */
export function DemoAccountCard({
  account,
  total,
}: {
  account: AccountWithHoldings
  total: AccountTotal
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-rule">
      <AccountHeader account={account} total={total} />
    </div>
  )
}
