export type BankAccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "loan"
  | "unknown"

/**
 * Liability accounts (credit cards, mortgages) subtract their owed balance
 * from net worth instead of adding it. This is the one place aggregation
 * consults account_type — checking vs savings remains display-only.
 */
export function isLiabilityType(type: BankAccountType): boolean {
  return type === "credit_card" || type === "loan"
}

export interface BankAccount {
  id: string
  simplefinAccountId: string
  institutionName: string
  accountName: string
  /** Best-effort guess at first sync; owner-correctable, display-only. */
  accountType: BankAccountType
  currency: string
  balance: number
  availableBalance: number | null
  /** When the institution says the balance was accurate. */
  balanceDate: string | null
  lastSyncedAt: string
  isHidden: boolean
  createdAt: string
}

export interface BankSyncReport {
  accounts: number
  inserted: number
  updated: number
  /** Messages from SimpleFIN's errors array — stale connections, rate limits. */
  simplefinErrors: string[]
}
