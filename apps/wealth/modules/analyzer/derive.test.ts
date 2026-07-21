import { describe, expect, it } from "vitest"
import type { ConsolidatedRow, PositionRow } from "@/modules/portfolio"
import {
  allocationByAssetClass,
  allocationBySector,
  foldSlices,
  incomeBreakdown,
  OTHER,
  positionSizes,
  tickerAccountBars,
  UNCLASSIFIED,
} from "./derive"

function position(overrides: Partial<PositionRow> = {}): PositionRow {
  return {
    holdingId: "h1",
    accountId: "a1",
    accountName: "Taxable",
    symbol: "AAPL",
    companyName: "Apple Inc",
    logoDomain: "apple.com",
    sector: "Technology",
    isCrypto: false,
    quantity: 10,
    avgCost: 100,
    missingCostBasis: false,
    price: 200,
    dayChangePct: 1,
    fetchedAt: "2026-07-06T12:00:00Z",
    isStaleQuote: false,
    priceIsBrokerNav: false,
    value: 2000,
    gainLoss: 1000,
    gainLossPct: 100,
    dividendYield: null,
    projectedAnnualIncome: null,
    ...overrides,
  }
}

function row(overrides: Partial<ConsolidatedRow> = {}): ConsolidatedRow {
  const base = position()
  return {
    symbol: base.symbol,
    companyName: base.companyName,
    logoDomain: base.logoDomain,
    sector: base.sector,
    isCrypto: base.isCrypto,
    quantity: base.quantity,
    avgCost: base.avgCost,
    missingCostBasis: false,
    price: base.price,
    dayChangePct: base.dayChangePct,
    fetchedAt: base.fetchedAt,
    isStaleQuote: false,
    priceIsBrokerNav: false,
    value: base.value,
    gainLoss: base.gainLoss,
    gainLossPct: base.gainLossPct,
    dividendYield: null,
    projectedAnnualIncome: null,
    positions: [base],
    ...overrides,
  }
}

describe("allocationBySector", () => {
  it("sums value per sector and sorts largest first", () => {
    const allocation = allocationBySector([
      row({ symbol: "AAPL", sector: "Technology", value: 3000 }),
      row({ symbol: "MSFT", sector: "Technology", value: 1000 }),
      row({ symbol: "JNJ", sector: "Pharmaceuticals", value: 6000 }),
    ])

    expect(allocation.total).toBe(10000)
    expect(allocation.slices).toEqual([
      { label: "Pharmaceuticals", value: 6000, pct: 60 },
      { label: "Technology", value: 4000, pct: 40 },
    ])
  })

  it("buckets unclassifiable symbols instead of dropping them", () => {
    const allocation = allocationBySector([
      row({ symbol: "AAPL", sector: "Technology", value: 500 }),
      row({ symbol: "FXAIX", sector: null, value: 500 }),
    ])

    // Equal values, so the label tiebreak decides: "Technology" < "Unclassified".
    expect(allocation.slices.map((slice) => slice.label)).toEqual([
      "Technology",
      UNCLASSIFIED,
    ])
  })

  it("excludes unpriced positions and reports them", () => {
    const allocation = allocationBySector([
      row({ symbol: "AAPL", value: 1000 }),
      row({ symbol: "ZZZ", value: null }),
    ])

    expect(allocation.total).toBe(1000)
    expect(allocation.excludedSymbols).toEqual(["ZZZ"])
    expect(allocation.slices).toHaveLength(1)
  })

  it("returns an empty allocation for no rows", () => {
    expect(allocationBySector([])).toEqual({
      slices: [],
      total: 0,
      excludedSymbols: [],
    })
  })
})

describe("allocationByAssetClass", () => {
  it("splits crypto from everything else", () => {
    const allocation = allocationByAssetClass([
      row({ symbol: "AAPL", isCrypto: false, value: 7500 }),
      row({ symbol: "BTC", isCrypto: true, value: 2500 }),
    ])

    expect(allocation.slices).toEqual([
      { label: "Equities & funds", value: 7500, pct: 75 },
      { label: "Crypto", value: 2500, pct: 25 },
    ])
  })
})

describe("foldSlices", () => {
  it("folds the tail into one Other bucket, preserving the total", () => {
    const allocation = allocationBySector([
      row({ symbol: "A", sector: "Technology", value: 500 }),
      row({ symbol: "B", sector: "Banking", value: 300 }),
      row({ symbol: "C", sector: "Retail", value: 150 }),
      row({ symbol: "D", sector: "Energy", value: 50 }),
    ])

    const folded = foldSlices(allocation, 3)
    expect(folded.slices).toEqual([
      { label: "Technology", value: 500, pct: 50 },
      { label: "Banking", value: 300, pct: 30 },
      { label: OTHER, value: 200, pct: 20 },
    ])
    expect(folded.total).toBe(allocation.total)
  })

  it("leaves an allocation already within the cap untouched", () => {
    const allocation = allocationBySector([row({ sector: "Technology", value: 100 })])
    expect(foldSlices(allocation, 8)).toBe(allocation)
  })
})

describe("positionSizes", () => {
  it("ranks priced positions by value with shares of the total", () => {
    const sizes = positionSizes([
      row({ symbol: "AAPL", value: 2000 }),
      row({ symbol: "MSFT", value: 8000 }),
      row({ symbol: "ZZZ", value: null }),
    ])

    expect(sizes.total).toBe(10000)
    expect(sizes.items.map((item) => item.symbol)).toEqual(["MSFT", "AAPL"])
    expect(sizes.items[0].pct).toBe(80)
    expect(sizes.excludedSymbols).toEqual(["ZZZ"])
  })
})

describe("tickerAccountBars", () => {
  it("breaks a ticker down by account, largest segment first", () => {
    const bars = tickerAccountBars([
      row({
        symbol: "GOOG",
        value: 4000,
        positions: [
          position({ symbol: "GOOG", accountId: "a1", accountName: "Taxable", value: 1000 }),
          position({ symbol: "GOOG", accountId: "a2", accountName: "401k", value: 3000 }),
        ],
      }),
    ])

    expect(bars).toHaveLength(1)
    expect(bars[0].total).toBe(4000)
    expect(bars[0].segments).toEqual([
      { accountId: "a2", accountName: "401k", value: 3000, pct: 75 },
      { accountId: "a1", accountName: "Taxable", value: 1000, pct: 25 },
    ])
  })

  it("merges duplicate holdings of one ticker inside the same account", () => {
    const bars = tickerAccountBars([
      row({
        symbol: "GOOG",
        positions: [
          position({ holdingId: "h1", accountId: "a1", accountName: "Taxable", value: 600 }),
          position({ holdingId: "h2", accountId: "a1", accountName: "Taxable", value: 400 }),
          position({ holdingId: "h3", accountId: "a2", accountName: "401k", value: 1000 }),
        ],
      }),
    ])

    expect(bars[0].segments).toHaveLength(2)
    expect(bars[0].segments.find((s) => s.accountId === "a1")?.value).toBe(1000)
  })

  it("skips tickers held in only one account", () => {
    const bars = tickerAccountBars([
      row({ symbol: "AAPL", positions: [position({ symbol: "AAPL", value: 2000 })] }),
    ])

    expect(bars).toEqual([])
  })

  it("ignores unpriced positions when splitting a ticker", () => {
    const bars = tickerAccountBars([
      row({
        symbol: "GOOG",
        positions: [
          position({ accountId: "a1", accountName: "Taxable", value: 1000 }),
          position({ accountId: "a2", accountName: "401k", value: null }),
        ],
      }),
    ])

    // One priced account left → nothing to compare, so no bar.
    expect(bars).toEqual([])
  })

  it("caps the bar count at the limit, keeping the largest", () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      row({
        symbol: `S${index}`,
        positions: [
          position({ symbol: `S${index}`, accountId: "a1", accountName: "A", value: index + 1 }),
          position({ symbol: `S${index}`, accountId: "a2", accountName: "B", value: index + 1 }),
        ],
      }),
    )

    const bars = tickerAccountBars(rows, 2)
    expect(bars.map((bar) => bar.symbol)).toEqual(["S4", "S3"])
  })
})

describe("incomeBreakdown", () => {
  it("ranks projected annual income and shares of the total", () => {
    const breakdown = incomeBreakdown([
      row({ symbol: "AAPL", dividendYield: 0.5, projectedAnnualIncome: 25 }),
      row({ symbol: "KO", dividendYield: 3, projectedAnnualIncome: 75 }),
    ])

    expect(breakdown.total).toBe(100)
    expect(breakdown.bars.map((bar) => bar.symbol)).toEqual(["KO", "AAPL"])
    expect(breakdown.bars[0].pct).toBe(75)
  })

  it("lists symbols with no yield data instead of charting them as zero", () => {
    const breakdown = incomeBreakdown([
      row({ symbol: "KO", dividendYield: 3, projectedAnnualIncome: 75 }),
      row({ symbol: "FXAIX", dividendYield: null, projectedAnnualIncome: null }),
    ])

    expect(breakdown.unknownYieldSymbols).toEqual(["FXAIX"])
    expect(breakdown.bars.map((bar) => bar.symbol)).toEqual(["KO"])
  })

  it("omits known non-payers from the bars without flagging them as unknown", () => {
    const breakdown = incomeBreakdown([
      row({ symbol: "TSLA", dividendYield: 0, projectedAnnualIncome: 0 }),
    ])

    expect(breakdown.bars).toEqual([])
    expect(breakdown.unknownYieldSymbols).toEqual([])
    expect(breakdown.total).toBe(0)
  })
})
