import type { AccountType } from "./types"

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  taxable: "Taxable",
  "401k": "401(k)",
  roth_ira: "Roth IRA",
  brokerage_link: "BrokerageLink",
}

export const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABELS) as [
  AccountType,
  string,
][]
