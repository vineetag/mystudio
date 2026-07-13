import { describe, expect, it } from "vitest"
import { mapPositions } from "./sync"

const SYNCED_AT = "2026-07-13T12:00:00Z"

function position(
  rawSymbol: string | null,
  units: number | null,
  avgCost: number | null = null,
  price: number | null = null,
) {
  return {
    symbol: { symbol: rawSymbol === null ? {} : { raw_symbol: rawSymbol } },
    units,
    average_purchase_price: avgCost,
    price,
  }
}

describe("mapPositions", () => {
  it("maps symbol, units, and per-share cost basis", () => {
    const { rows, skipped } = mapPositions([position("goog", 10, 150.5)], SYNCED_AT)
    expect(rows).toEqual([
      {
        symbol: "GOOG",
        quantity: 10,
        avg_cost: 150.5,
        asset_class: "equity",
        price: null,
        price_as_of: null,
      },
    ])
    expect(skipped).toEqual([])
  })

  it("captures the broker-reported price (NAV) for funds Finnhub can't quote", () => {
    const { rows } = mapPositions([position("FBGRX", 148.081, null, 210.42)], SYNCED_AT)
    expect(rows[0]).toMatchObject({
      symbol: "FBGRX",
      price: 210.42,
      price_as_of: SYNCED_AT,
    })
  })

  it("skips short positions, zero units, and missing symbols with reasons", () => {
    const { rows, skipped } = mapPositions([
      position("TSLA", -5),
      position("MSFT", 0),
      position(null, 10),
    ])
    expect(rows).toEqual([])
    expect(skipped).toHaveLength(3)
    expect(skipped[0]).toContain("TSLA")
    expect(skipped[2]).toContain("no usable ticker symbol")
  })

  it("keeps a null cost basis (401k-style) instead of fabricating one", () => {
    const { rows } = mapPositions([position("VTI", 3)])
    expect(rows[0].avg_cost).toBeNull()
  })

  it("merges duplicate symbols, cost-weighting the basis", () => {
    const { rows } = mapPositions([
      position("GOOG", 10, 100),
      position("GOOG", 10, 200),
    ])
    expect(rows).toEqual([
      {
        symbol: "GOOG",
        quantity: 20,
        avg_cost: 150,
        asset_class: "equity",
        price: null,
        price_as_of: null,
      },
    ])
  })

  it("merged basis is null when either side lacks one", () => {
    const { rows } = mapPositions([
      position("GOOG", 10, 100),
      position("GOOG", 10),
    ])
    expect(rows[0]).toMatchObject({ quantity: 20, avg_cost: null })
  })
})
