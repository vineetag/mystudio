export interface Holding {
  id: string
  accountId: string
  symbol: string
  quantity: number
  /**
   * Null for positions without a cost basis (e.g. 401k transfers). Null rows
   * are badged in the UI and excluded from gain/loss math.
   */
  avgCost: number | null
  createdAt: string
  updatedAt: string
}
