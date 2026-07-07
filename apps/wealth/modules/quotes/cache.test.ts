import { describe, expect, it } from "vitest"
import {
  partitionByFreshness,
  QUOTE_TTL_MS,
  rowToQuoteView,
  unavailableQuoteView,
  type CachedQuoteRow,
} from "./cache"

const NOW = new Date("2026-07-06T12:00:00Z")

function row(symbol: string, ageMs: number, price = "100.5"): CachedQuoteRow {
  return {
    symbol,
    price,
    day_change_pct: "1.25",
    fetched_at: new Date(NOW.getTime() - ageMs).toISOString(),
  }
}

describe("partitionByFreshness", () => {
  it("serves rows younger than the TTL as fresh", () => {
    const { fresh, toFetch, fallback } = partitionByFreshness(
      ["GOOG"],
      [row("GOOG", QUOTE_TTL_MS - 1000)],
      NOW,
    )
    expect(fresh).toHaveLength(1)
    expect(fresh[0]).toMatchObject({ symbol: "GOOG", price: 100.5, isStale: false })
    expect(toFetch).toEqual([])
    expect(fallback.size).toBe(0)
  })

  it("marks rows at or past the TTL for refetch, keeping a stale fallback", () => {
    const { fresh, toFetch, fallback } = partitionByFreshness(
      ["GOOG"],
      [row("GOOG", QUOTE_TTL_MS)],
      NOW,
    )
    expect(fresh).toEqual([])
    expect(toFetch).toEqual(["GOOG"])
    expect(fallback.get("GOOG")).toMatchObject({ price: 100.5, isStale: true })
  })

  it("queues symbols absent from cache with no fallback", () => {
    const { fresh, toFetch, fallback } = partitionByFreshness(["NVDA"], [], NOW)
    expect(fresh).toEqual([])
    expect(toFetch).toEqual(["NVDA"])
    expect(fallback.has("NVDA")).toBe(false)
  })

  it("handles a mixed set", () => {
    const { fresh, toFetch, fallback } = partitionByFreshness(
      ["A", "B", "C"],
      [row("A", 60_000), row("B", QUOTE_TTL_MS * 2)],
      NOW,
    )
    expect(fresh.map((view) => view.symbol)).toEqual(["A"])
    expect(toFetch).toEqual(["B", "C"])
    expect([...fallback.keys()]).toEqual(["B"])
  })
})

describe("rowToQuoteView", () => {
  it("converts numeric strings and preserves null day change", () => {
    const view = rowToQuoteView(
      { symbol: "X", price: "42.1", day_change_pct: null, fetched_at: NOW.toISOString() },
      true,
    )
    expect(view).toEqual({
      symbol: "X",
      price: 42.1,
      dayChangePct: null,
      fetchedAt: NOW.toISOString(),
      isStale: true,
    })
  })
})

describe("unavailableQuoteView", () => {
  it("has null price and timestamp — nothing fabricated", () => {
    expect(unavailableQuoteView("FXAIX")).toEqual({
      symbol: "FXAIX",
      price: null,
      dayChangePct: null,
      fetchedAt: null,
      isStale: false,
    })
  })
})
