import { describe, expect, it } from "vitest"
import {
  mergeQuoteViews,
  partitionByFreshness,
  partitionForPollRefresh,
  QUOTE_POLL_MS,
  QUOTE_TTL_MS,
  rowToQuoteView,
  unavailableQuoteView,
  YIELD_TTL_MS,
  yieldNeedsRefresh,
  type CachedQuoteRow,
} from "./cache"
import type { QuoteView } from "./types"

const NOW = new Date("2026-07-06T12:00:00Z")

function row(symbol: string, ageMs: number, price = "100.5"): CachedQuoteRow {
  return {
    symbol,
    price,
    day_change_pct: "1.25",
    dividend_yield: null,
    fetched_at: new Date(NOW.getTime() - ageMs).toISOString(),
    yield_fetched_at: null,
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

describe("partitionForPollRefresh", () => {
  it("serves rows younger than the poll interval as fresh", () => {
    const { fresh, toFetch } = partitionForPollRefresh(
      ["GOOG"],
      [row("GOOG", QUOTE_POLL_MS - 1000)],
      NOW,
    )
    expect(fresh).toHaveLength(1)
    expect(fresh[0]).toMatchObject({ symbol: "GOOG", isStale: false })
    expect(toFetch).toEqual([])
  })

  it("refetches rows at or past the poll interval without a stale badge", () => {
    const { fresh, toFetch, fallback } = partitionForPollRefresh(
      ["GOOG"],
      [row("GOOG", QUOTE_POLL_MS)],
      NOW,
    )
    expect(fresh).toEqual([])
    expect(toFetch).toEqual(["GOOG"])
    // A couple-minutes-old fallback is not alarming — only TTL-old rows are.
    expect(fallback.get("GOOG")).toMatchObject({ isStale: false })
  })

  it("badges the fallback as stale once the row is past the cache TTL", () => {
    const { toFetch, fallback } = partitionForPollRefresh(
      ["GOOG"],
      [row("GOOG", QUOTE_TTL_MS)],
      NOW,
    )
    expect(toFetch).toEqual(["GOOG"])
    expect(fallback.get("GOOG")).toMatchObject({ isStale: true })
  })
})

describe("rowToQuoteView", () => {
  it("converts numeric strings and preserves null day change", () => {
    const view = rowToQuoteView(
      {
        symbol: "X",
        price: "42.1",
        day_change_pct: null,
        dividend_yield: "0.55",
        fetched_at: NOW.toISOString(),
        yield_fetched_at: NOW.toISOString(),
      },
      true,
    )
    expect(view).toEqual({
      symbol: "X",
      price: 42.1,
      dayChangePct: null,
      dividendYield: 0.55,
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
      dividendYield: null,
      fetchedAt: null,
      isStale: false,
    })
  })
})

describe("mergeQuoteViews", () => {
  function view(symbol: string, fetchedAt: string | null, isStale = false): QuoteView {
    return {
      symbol,
      price: 100,
      dayChangePct: 1.5,
      dividendYield: null,
      fetchedAt,
      isStale,
    }
  }

  it("adds new symbols and updates existing ones with newer quotes", () => {
    const current = new Map([["^GSPC", view("^GSPC", "2026-07-06T11:00:00Z", true)]])
    const next = mergeQuoteViews(current, {
      "^GSPC": view("^GSPC", "2026-07-06T12:00:00Z"),
      "^IXIC": view("^IXIC", "2026-07-06T12:00:00Z"),
    })
    expect(next.get("^GSPC")).toMatchObject({ fetchedAt: "2026-07-06T12:00:00Z", isStale: false })
    expect(next.has("^IXIC")).toBe(true)
    expect(next).not.toBe(current)
  })

  it("keeps the newer existing quote when a late response carries an older one", () => {
    const current = new Map([["AAPL", view("AAPL", "2026-07-06T12:00:00Z")]])
    const next = mergeQuoteViews(current, {
      AAPL: view("AAPL", "2026-07-06T11:30:00Z", true),
    })
    expect(next.get("AAPL")).toMatchObject({ fetchedAt: "2026-07-06T12:00:00Z", isStale: false })
  })

  it("compares timestamps as dates across offset formats", () => {
    // Cache rows carry +00:00, fresh fetches carry Z — lexical compare would
    // wrongly treat every Z timestamp as newer than every +00:00 one.
    const current = new Map([["AAPL", view("AAPL", "2026-07-06T12:00:00+00:00")]])
    const next = mergeQuoteViews(current, {
      AAPL: view("AAPL", "2026-07-06T11:00:00Z", true),
    })
    expect(next.get("AAPL")).toMatchObject({ fetchedAt: "2026-07-06T12:00:00+00:00" })
  })

  it("lets a quote with a timestamp replace an unavailable one and not vice versa", () => {
    const unavailable = view("TSM", null)
    unavailable.price = null

    const gainedPrice = mergeQuoteViews(new Map([["TSM", unavailable]]), {
      TSM: view("TSM", "2026-07-06T12:00:00Z"),
    })
    expect(gainedPrice.get("TSM")).toMatchObject({ price: 100 })

    // An incoming null-timestamp view still replaces — the server said the
    // symbol became unavailable, which the dashboard must reflect.
    const wentUnavailable = mergeQuoteViews(
      new Map([["TSM", view("TSM", "2026-07-06T12:00:00Z")]]),
      { TSM: unavailable },
    )
    expect(wentUnavailable.get("TSM")).toMatchObject({ price: null })
  })
})

describe("yieldNeedsRefresh", () => {
  it("wants a refresh when the row is missing or never fetched", () => {
    expect(yieldNeedsRefresh(undefined, NOW)).toBe(true)
    expect(yieldNeedsRefresh({ yield_fetched_at: null }, NOW)).toBe(true)
  })

  it("keeps a yield fetched within 24 hours — even a stored null", () => {
    const recent = new Date(NOW.getTime() - YIELD_TTL_MS + 60_000).toISOString()
    expect(yieldNeedsRefresh({ yield_fetched_at: recent }, NOW)).toBe(false)
  })

  it("refreshes once the yield is a day old", () => {
    const old = new Date(NOW.getTime() - YIELD_TTL_MS).toISOString()
    expect(yieldNeedsRefresh({ yield_fetched_at: old }, NOW)).toBe(true)
  })
})
