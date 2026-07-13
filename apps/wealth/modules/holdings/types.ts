import type { AssetClass } from "./asset-class"

export interface Holding {
  id: string
  accountId: string
  symbol: string
  /** Drives Finnhub quote routing — equity uses /quote, crypto uses /crypto/candle. */
  assetClass: AssetClass
  quantity: number
  /**
   * Null for positions without a cost basis (e.g. 401k transfers). Null rows
   * are badged in the UI and excluded from gain/loss math.
   */
  avgCost: number | null
  /**
   * Broker-reported price/NAV from the last sync. The quote engine falls back
   * to this when Finnhub can't price the symbol (401k mutual funds, opaque
   * collective-trust fund IDs). Null for manually entered holdings.
   */
  brokerPrice: number | null
  /** When the broker reported brokerPrice; null when there is none. */
  brokerPriceAsOf: string | null
  createdAt: string
  updatedAt: string
}
