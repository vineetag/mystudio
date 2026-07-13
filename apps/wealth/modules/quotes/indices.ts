// Market index constants — client-safe (no server-only imports).
// The dashboard shows real index levels (^GSPC, ^IXIC) fetched from Yahoo
// Finance, not ETF proxies. Snapshot benchmarks stay on SPY/QQQ — those
// columns hold a historical series that must not switch units mid-stream.

export const MARKET_INDICES = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq Composite" },
] as const

export const INDEX_SYMBOLS: string[] = MARKET_INDICES.map((index) => index.symbol)

/** Caret-prefixed symbols are indices: priced via Yahoo, never holdings. */
export function isIndexSymbol(symbol: string): boolean {
  return symbol.startsWith("^")
}
