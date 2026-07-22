export type BankAccountType = "checking" | "savings" | "unknown"

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
