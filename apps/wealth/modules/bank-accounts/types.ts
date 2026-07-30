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
  /** Existing rows re-keyed to a new SimpleFIN id after a reconnect. */
  relinked: number
  /** Duplicate rows a pre-fix reconnect left behind, folded into the live row. */
  merged: number
  /** Rows a clean feed stopped returning — flagged, hidden, not deleted. */
  disconnected: number
  /** Messages from SimpleFIN's errors array — stale connections, rate limits. */
  simplefinErrors: string[]
}

/** Warnings persisted by the last sync, for the dashboard reconnect banner. */
export interface BankSyncHealth {
  errors: string[]
  syncedAt: string
}
