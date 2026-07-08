export type ConnectionStatus = "connected" | "syncing" | "error" | "disabled"

/** What the UI shows per brokerage authorization. */
export interface SnapTradeConnection {
  id: string
  broker: string
  status: ConnectionStatus
  lastSyncedAt: string | null
  lastError: string | null
}

export interface SyncReport {
  connections: number
  accounts: number
  holdings: number
  /** Rows skipped with the reason (short positions, unusable symbols, …). */
  skipped: string[]
}
