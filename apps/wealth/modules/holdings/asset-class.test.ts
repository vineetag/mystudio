import { describe, expect, it } from "vitest"
import {
  assetClassMapFromHoldings,
  inferAssetClass,
  normalizeCryptoSymbol,
} from "./asset-class"

describe("inferAssetClass", () => {
  it("prefers an explicit crypto value from the database", () => {
    expect(inferAssetClass("BTC", "crypto")).toBe("crypto")
  })

  it("infers crypto for symbols without a stock ticker collision", () => {
    expect(inferAssetClass("SOL", "equity")).toBe("crypto")
    expect(inferAssetClass("LINK", "equity")).toBe("crypto")
  })

  it("keeps ambiguous tickers on equity unless marked crypto", () => {
    expect(inferAssetClass("BTC", "equity")).toBe("equity")
    expect(inferAssetClass("ETH", "equity")).toBe("equity")
  })
})

describe("normalizeCryptoSymbol", () => {
  it("maps Kraken aliases to BTC", () => {
    expect(normalizeCryptoSymbol("xbt")).toBe("BTC")
    expect(normalizeCryptoSymbol("XXBT")).toBe("BTC")
  })
})

describe("assetClassMapFromHoldings", () => {
  it("prefers crypto when the same symbol appears with mixed classes", () => {
    const map = assetClassMapFromHoldings([
      { symbol: "BTC", assetClass: "equity" },
      { symbol: "BTC", assetClass: "crypto" },
    ])
    expect(map.get("BTC")).toBe("crypto")
  })
})
