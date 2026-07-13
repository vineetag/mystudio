import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchYahooIndexQuote } from "./yahoo"
import { UnknownSymbolError } from "./finnhub"

function chartResponse(
  meta: Record<string, unknown> | undefined,
  status = 200,
): Response {
  const body =
    meta === undefined
      ? { chart: { result: null, error: { code: "Not Found" } } }
      : { chart: { result: [{ meta }], error: null } }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("fetchYahooIndexQuote", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("returns the index level and day change vs the prior close", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      chartResponse({ regularMarketPrice: 7515.34, chartPreviousClose: 7575.39 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const quote = await fetchYahooIndexQuote("^GSPC")
    expect(quote.price).toBe(7515.34)
    expect(quote.dayChangePct).toBeCloseTo(-0.7927, 4)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain("/chart/%5EGSPC")
  })

  it("returns a null day change when the prior close is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(chartResponse({ regularMarketPrice: 25873.18 })),
    )

    await expect(fetchYahooIndexQuote("^IXIC")).resolves.toEqual({
      price: 25873.18,
      dayChangePct: null,
    })
  })

  it("throws UnknownSymbolError on a 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(chartResponse(undefined, 404))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchYahooIndexQuote("^FAKE")).rejects.toBeInstanceOf(
      UnknownSymbolError,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("throws UnknownSymbolError when the payload has no market price", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(chartResponse({})))
    await expect(fetchYahooIndexQuote("^GSPC")).rejects.toBeInstanceOf(
      UnknownSymbolError,
    )
  })

  it("retries on 429 with backoff, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(chartResponse(undefined, 429))
      .mockResolvedValueOnce(
        chartResponse({ regularMarketPrice: 100, chartPreviousClose: 99 }),
      )
    vi.stubGlobal("fetch", fetchMock)

    const promise = fetchYahooIndexQuote("^GSPC")
    await vi.advanceTimersByTimeAsync(1200)
    const quote = await promise
    expect(quote.price).toBe(100)
    expect(quote.dayChangePct).toBeCloseTo(1.0101, 4)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("gives up after exhausting retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(chartResponse(undefined, 503))
    vi.stubGlobal("fetch", fetchMock)

    const promise = fetchYahooIndexQuote("^GSPC")
    const assertion = expect(promise).rejects.toThrow("Yahoo Finance responded 503.")
    await vi.advanceTimersByTimeAsync(1200 + 2400)
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
