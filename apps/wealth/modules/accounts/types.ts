export type AccountType = "taxable" | "401k" | "roth_ira" | "brokerage_link"

export type AccountSource = "manual" | "snaptrade"

export interface Account {
  id: string
  userId: string | null
  name: string
  broker: string
  accountType: AccountType
  source: AccountSource
  isDemo: boolean
  createdAt: string
  updatedAt: string
}
