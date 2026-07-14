export type AccountType = "taxable" | "401k" | "roth_ira" | "brokerage_link"

export type AccountSource = "manual" | "snaptrade"

export interface Account {
  id: string
  userId: string | null
  name: string
  broker: string
  /** Official broker logo URL captured from SnapTrade (live); null otherwise. */
  brokerLogoUrl: string | null
  accountType: AccountType
  source: AccountSource
  isDemo: boolean
  /** Hidden accounts stay manageable on /accounts but are excluded from the dashboard and portfolio total. */
  hidden: boolean
  createdAt: string
  updatedAt: string
}
