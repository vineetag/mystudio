import { describe, expect, it } from "vitest"
import type { ConsolidatedRow, PortfolioTotal, PositionRow } from "@/modules/portfolio"
import {
  buildHoldingContext,
  buildPortfolioContext,
  buildResearchContext,
} from "./context"

const AS_OF = new Date("2026-07-20T15:00:00.000Z")

function position(overrides: Partial<PositionRow> = {}): PositionRow {
  return {
    holdingId: "h1",
    accountId: "a1",
    accountName: "Schwab Taxable",
    symbol: "NVDA",
    companyName: "NVIDIA Corporation",
    logoDomain: null,
    sector: "Semiconductors",
    isCrypto: false,
    quantity: 10,
    avgCost: 100,
    missingCostBasis: false,
    price: 200,
    dayChangePct: 1.5,
    fetchedAt: AS_OF.toISOString(),
    isStaleQuote: false,
    priceIsBrokerNav: false,
    value: 2000,
    gainLoss: 1000,
    gainLossPct: 100,
    dividendYield: 0.5,
    projectedAnnualIncome: 10,
    ...overrides,
  }
}

function row(overrides: Partial<ConsolidatedRow> = {}): ConsolidatedRow {
  const positions = overrides.positions ?? [position()]
  return {
    symbol: "NVDA",
    companyName: "NVIDIA Corporation",
    logoDomain: null,
    sector: "Semiconductors",
    isCrypto: false,
    quantity: 10,
    avgCost: 100,
    missingCostBasis: false,
    price: 200,
    dayChangePct: 1.5,
    fetchedAt: AS_OF.toISOString(),
    isStaleQuote: false,
    priceIsBrokerNav: false,
    value: 2000,
    gainLoss: 1000,
    gainLossPct: 100,
    dividendYield: 0.5,
    projectedAnnualIncome: 10,
    ...overrides,
    positions,
  }
}

const TOTAL: PortfolioTotal = {
  value: 10_000,
  unpricedSymbols: [],
  projectedAnnualIncome: 120,
}

describe("buildPortfolioContext", () => {
  it("states the total, the ticker count, and each holding's weight", () => {
    const context = buildPortfolioContext({
      rows: [row()],
      total: TOTAL,
      accounts: [{ name: "Schwab Taxable", typeLabel: "Taxable" }],
      asOf: AS_OF,
    })

    expect(context).toContain("Total priced value: 10000.00 USD")
    expect(context).toContain("Distinct tickers: 1")
    expect(context).toContain("NVDA (NVIDIA Corporation)")
    expect(context).toContain("weight 20.00%") // 2000 of 10000
    expect(context).toContain("- Schwab Taxable (Taxable)")
  })

  it("names unpriced symbols and says they are excluded from the total", () => {
    const context = buildPortfolioContext({
      rows: [row()],
      total: { ...TOTAL, unpricedSymbols: ["FXAIX"] },
      accounts: [],
      asOf: AS_OF,
    })

    expect(context).toContain("Unpriced symbols (EXCLUDED from the total above): FXAIX")
  })

  it("writes unavailable rather than omitting a figure the model might invent", () => {
    const context = buildPortfolioContext({
      rows: [row({ price: null, value: null, gainLoss: null, gainLossPct: null })],
      total: TOTAL,
      accounts: [],
      asOf: AS_OF,
    })

    expect(context).toContain("price unavailable")
    expect(context).toContain("value unavailable")
    expect(context).toContain("weight unavailable")
  })

  it("flags missing cost basis, broker NAV pricing, and stale quotes", () => {
    const context = buildPortfolioContext({
      rows: [row({ missingCostBasis: true, priceIsBrokerNav: true, isStaleQuote: true })],
      total: TOTAL,
      accounts: [],
      asOf: AS_OF,
    })

    expect(context).toContain("NOTE: some lots have no cost basis")
    expect(context).toContain("NOTE: price is broker NAV, not a live quote")
    expect(context).toContain("NOTE: quote is stale")
  })
})

describe("buildHoldingContext", () => {
  it("includes the portfolio total so the model can size the position", () => {
    const context = buildHoldingContext(row(), TOTAL, AS_OF)

    expect(context).toContain("Symbol: NVDA")
    expect(context).toContain("Total portfolio priced value: 10000.00 USD")
    expect(context).toContain("weight 20.00%")
  })

  it("breaks the position out per account", () => {
    const context = buildHoldingContext(
      row({
        positions: [
          position({ accountName: "Schwab Taxable", quantity: 6, value: 1200 }),
          position({ accountName: "Robinhood", quantity: 4, value: 800 }),
        ],
      }),
      TOTAL,
      AS_OF,
    )

    expect(context).toContain("- Schwab Taxable: qty 6")
    expect(context).toContain("- Robinhood: qty 4")
  })
})

describe("buildResearchContext", () => {
  it("marks the symbol as not held and carries the live quote when we have one", () => {
    const context = buildResearchContext(
      "PLTR",
      { price: 42.5, dayChangePct: -1.25, fetchedAt: AS_OF.toISOString() },
      AS_OF,
    )

    expect(context).toContain("Symbol: PLTR")
    expect(context).toContain("Held in portfolio: no")
    expect(context).toContain("Live price: 42.50 USD")
    expect(context).toContain("Day change: -1.25%")
  })

  it("says the price is unavailable rather than leaving the model to guess", () => {
    const context = buildResearchContext("PLTR", null, AS_OF)
    expect(context).toContain("Live price: unavailable")
  })
})
