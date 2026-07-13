// Asset-class helpers for quote routing and SnapTrade ingestion.

export type AssetClass = "equity" | "crypto"

/**
 * Symbols that are crypto on US brokerages and do not collide with a major
 * US-listed stock/ETF ticker. Used to infer crypto pricing when asset_class
 * was not persisted (manual entry, pre-migration rows).
 */
export const CRYPTO_ONLY_SYMBOLS = new Set([
  "ADA",
  "ALGO",
  "APT",
  "ARB",
  "ATOM",
  "AVAX",
  "BCH",
  "DOGE",
  "DOT",
  "ETC",
  "LINK",
  "LTC",
  "MATIC",
  "NEAR",
  "OP",
  "PEPE",
  "SHIB",
  "SOL",
  "SUI",
  "UNI",
  "XLM",
  "XRP",
])

/** Broker-specific aliases normalized before Finnhub crypto pair lookup. */
export const CRYPTO_SYMBOL_ALIASES: Record<string, string> = {
  XBT: "BTC",
  XXBT: "BTC",
}

export function normalizeCryptoSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase()
  return CRYPTO_SYMBOL_ALIASES[upper] ?? upper
}

/** Resolve how a symbol should be priced, preferring an explicit DB value. */
export function inferAssetClass(
  symbol: string,
  explicit: AssetClass = "equity",
): AssetClass {
  if (explicit === "crypto") return "crypto"
  if (CRYPTO_ONLY_SYMBOLS.has(symbol.trim().toUpperCase())) return "crypto"
  return explicit
}

export function assetClassMapFromHoldings(
  holdings: Array<{ symbol: string; assetClass: AssetClass }>,
): Map<string, AssetClass> {
  const map = new Map<string, AssetClass>()
  for (const holding of holdings) {
    const symbol = holding.symbol.trim().toUpperCase()
    const resolved = inferAssetClass(symbol, holding.assetClass)
    const existing = map.get(symbol)
    if (existing === undefined) {
      map.set(symbol, resolved)
    } else if (existing !== resolved) {
      map.set(symbol, existing === "crypto" || resolved === "crypto" ? "crypto" : "equity")
    }
  }
  return map
}

export function assetClassMapFromAccounts(
  accounts: Array<{ holdings: Array<{ symbol: string; assetClass: AssetClass }> }>,
): Map<string, AssetClass> {
  return assetClassMapFromHoldings(accounts.flatMap((account) => account.holdings))
}
