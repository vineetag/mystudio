import { describe, expect, it } from "vitest"
import { mapOpenBuyOrders, mapPositions, mergeRows } from "./sync"

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

function buyOrder(
  rawSymbol: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    action: "BUY",
    status: "PENDING",
    universal_symbol: { raw_symbol: rawSymbol },
    total_quantity: "10",
    open_quantity: "10",
    filled_quantity: "0",
    canceled_quantity: "0",
    ...overrides,
  }
}

describe("mapOpenBuyOrders", () => {
  it("maps a pending buy to a holding row with the limit price as basis", () => {
    const { rows, skipped } = mapOpenBuyOrders([
      buyOrder("aapl", { limit_price: "185.50" }),
    ])
    expect(rows).toEqual([
      {
        symbol: "AAPL",
        quantity: 10,
        avg_cost: 185.5,
        asset_class: "equity",
        price: null,
        price_as_of: null,
      },
    ])
    expect(skipped).toEqual([])
  })

  it("uses only the unfilled remainder of a partially filled order", () => {
    const { rows } = mapOpenBuyOrders([
      buyOrder("AAPL", { open_quantity: "4", filled_quantity: "6" }),
    ])
    expect(rows[0].quantity).toBe(4)
  })

  it("derives the open quantity when the broker omits open_quantity", () => {
    const { rows } = mapOpenBuyOrders([
      buyOrder("AAPL", {
        open_quantity: null,
        total_quantity: "10",
        filled_quantity: "3",
        canceled_quantity: "2",
      }),
    ])
    expect(rows[0].quantity).toBe(5)
  })

  it("ignores sell orders and option orders", () => {
    const { rows, skipped } = mapOpenBuyOrders([
      buyOrder("AAPL", { action: "SELL" }),
      buyOrder("AAPL", { option_symbol: { ticker: "AAPL 260117C00200000" } }),
    ])
    expect(rows).toEqual([])
    expect(skipped).toHaveLength(1)
    expect(skipped[0]).toContain("option")
  })

  it("leaves the basis null for market orders with no price", () => {
    const { rows } = mapOpenBuyOrders([buyOrder("AAPL")])
    expect(rows[0].avg_cost).toBeNull()
  })

  it("flags crypto buys by universal symbol type", () => {
    const { rows } = mapOpenBuyOrders([
      buyOrder("BTC", {
        universal_symbol: { raw_symbol: "BTC", type: { code: "crypto" } },
      }),
    ])
    expect(rows[0].asset_class).toBe("crypto")
  })
})

describe("mergeRows", () => {
  it("folds a pending buy into an existing position row", () => {
    const positions = mapPositions([position("AAPL", 10, 100)]).rows
    const pending = mapOpenBuyOrders([
      buyOrder("AAPL", { open_quantity: "5", limit_price: "200" }),
    ]).rows
    const merged = mergeRows([...positions, ...pending])
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      symbol: "AAPL",
      quantity: 15,
      avg_cost: (10 * 100 + 5 * 200) / 15,
    })
  })
})
