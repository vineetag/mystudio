import { describe, expect, it } from "vitest"
import type { AccountWithHoldings } from "@/modules/accounts"
import type { QuoteView } from "@/modules/quotes"
import { consolidate, derivePositions, portfolioTotal } from "./derive"

const FETCHED_AT = "2026-07-06T12:00:00Z"

function account(
  id: string,
  name: string,
  holdings: Array<{ symbol: string; quantity: number; avgCost: number | null }>,
): AccountWithHoldings {
  return {
    id,
    userId: "user-1",
    name,
    broker: "Test",
    accountType: "taxable",
    source: "manual",
    isDemo: false,
    createdAt: FETCHED_AT,
    updatedAt: FETCHED_AT,
    holdings: holdings.map((holding, index) => ({
      id: `${id}-h${index}`,
      accountId: id,
      symbol: holding.symbol,
      quantity: holding.quantity,
      avgCost: holding.avgCost,
      createdAt: FETCHED_AT,
      updatedAt: FETCHED_AT,
    })),
  }
}

function quote(symbol: string, price: number | null, isStale = false): [string, QuoteView] {
  return [
    symbol,
    {
      symbol,
      price,
      dayChangePct: price === null ? null : 0.5,
      fetchedAt: price === null ? null : FETCHED_AT,
      isStale,
    },
  ]
}

describe("derivePositions", () => {
  it("computes value and gain/loss when price and cost basis exist", () => {
    const rows = derivePositions(
      [account("a1", "Roth", [{ symbol: "GOOG", quantity: 10, avgCost: 100 }])],
      new Map([quote("GOOG", 150)]),
    )
    expect(rows[0]).toMatchObject({
      value: 1500,
      gainLoss: 500,
      gainLossPct: 50,
      missingCostBasis: false,
    })
  })

  it("excludes gain/loss but keeps value when cost basis is missing", () => {
    const rows = derivePositions(
      [account("a1", "401k", [{ symbol: "GOOG", quantity: 10, avgCost: null }])],
      new Map([quote("GOOG", 150)]),
    )
    expect(rows[0]).toMatchObject({
      value: 1500,
      gainLoss: null,
      gainLossPct: null,
      missingCostBasis: true,
    })
  })

  it("marks everything derived as null when the price is unavailable", () => {
    const rows = derivePositions(
      [account("a1", "Roth", [{ symbol: "FXAIX", quantity: 5, avgCost: 100 }])],
      new Map([quote("FXAIX", null)]),
    )
    expect(rows[0]).toMatchObject({ value: null, gainLoss: null, gainLossPct: null })
  })

  it("avoids divide-by-zero on a zero cost basis", () => {
    const rows = derivePositions(
      [account("a1", "Roth", [{ symbol: "GOOG", quantity: 2, avgCost: 0 }])],
      new Map([quote("GOOG", 10)]),
    )
    expect(rows[0]).toMatchObject({ gainLoss: 20, gainLossPct: null })
  })
})

describe("consolidate", () => {
  const accounts = [
    account("a1", "Roth", [{ symbol: "GOOG", quantity: 10, avgCost: 100 }]),
    account("a2", "401k", [{ symbol: "GOOG", quantity: 30, avgCost: null }]),
    account("a3", "Taxable", [
      { symbol: "GOOG", quantity: 10, avgCost: 200 },
      { symbol: "VTI", quantity: 1, avgCost: 50 },
    ]),
  ]
  const quotes = new Map([quote("GOOG", 150), quote("VTI", 100)])

  it("groups by symbol with weighted avg cost over cost-basis rows only", () => {
    const rows = consolidate(derivePositions(accounts, quotes))
    const goog = rows.find((row) => row.symbol === "GOOG")!
    expect(goog.quantity).toBe(50)
    // Weighted over the 20 shares with basis: (10*100 + 10*200) / 20 = 150
    expect(goog.avgCost).toBe(150)
    // Gain/loss over basis shares only: 150*20 - 3000 = 0
    expect(goog.gainLoss).toBe(0)
    expect(goog.gainLossPct).toBe(0)
    // Value covers ALL shares, including the no-basis 30.
    expect(goog.value).toBe(7500)
    expect(goog.missingCostBasis).toBe(true)
    expect(goog.positions.map((position) => position.accountName)).toEqual([
      "401k",
      "Roth",
      "Taxable",
    ])
  })

  it("sorts by value descending with unpriced symbols last", () => {
    const withUnpriced = [
      ...accounts,
      account("a4", "Extra", [{ symbol: "FXAIX", quantity: 100, avgCost: 10 }]),
    ]
    const rows = consolidate(
      derivePositions(withUnpriced, new Map([...quotes, quote("FXAIX", null)])),
    )
    expect(rows.map((row) => row.symbol)).toEqual(["GOOG", "VTI", "FXAIX"])
  })
})

describe("portfolioTotal", () => {
  it("sums priced positions and lists unpriced symbols separately", () => {
    const positions = derivePositions(
      [
        account("a1", "Roth", [
          { symbol: "GOOG", quantity: 10, avgCost: 100 },
          { symbol: "FXAIX", quantity: 5, avgCost: 10 },
        ]),
      ],
      new Map([quote("GOOG", 150), quote("FXAIX", null)]),
    )
    expect(portfolioTotal(positions)).toEqual({
      value: 1500,
      unpricedSymbols: ["FXAIX"],
    })
  })
})
