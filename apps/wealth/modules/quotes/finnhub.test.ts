import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchFinnhubCryptoQuote,
  fetchFinnhubDividendYield,
  fetchFinnhubQuote,
  UnknownSymbolError,
} from "./finnhub"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("fetchFinnhubQuote", () => {
  beforeEach(() => {
    vi.stubEnv("FINNHUB_API_KEY", "test-key")
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("returns price and day change on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ c: 187.3, dp: -0.42 })))
    await expect(fetchFinnhubQuote("GOOG")).resolves.toEqual({
      price: 187.3,
      dayChangePct: -0.42,
    })
  })

  it("retries on 429 with backoff, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({ c: 50, dp: 1.1 }))
    vi.stubGlobal("fetch", fetchMock)

    const promise = fetchFinnhubQuote("NVDA")
    await vi.advanceTimersByTimeAsync(1200)
    await expect(promise).resolves.toEqual({ price: 50, dayChangePct: 1.1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("gives up after exhausting retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 503))
    vi.stubGlobal("fetch", fetchMock)

    const promise = fetchFinnhubQuote("MSFT")
    const assertion = expect(promise).rejects.toThrow("Finnhub responded 503.")
    await vi.advanceTimersByTimeAsync(1200 + 2400)
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("throws UnknownSymbolError on Finnhub's all-zero payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ c: 0, dp: 0, t: 0 })))
    await expect(fetchFinnhubQuote("FXAIX")).rejects.toBeInstanceOf(UnknownSymbolError)
  })

  it("throws UnknownSymbolError when Finnhub returns 403 for unsupported symbols", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 403))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchFinnhubQuote("FXAIX")).rejects.toBeInstanceOf(UnknownSymbolError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("fails clearly when the API key is missing", async () => {
    vi.stubEnv("FINNHUB_API_KEY", "")
    await expect(fetchFinnhubQuote("GOOG")).rejects.toThrow("FINNHUB_API_KEY is not set")
  })

  it("does not retry non-retryable HTTP errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 401))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchFinnhubQuote("GOOG")).rejects.toThrow('Finnhub responded 401 for "GOOG".')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("fetchFinnhubDividendYield", () => {
  beforeEach(() => {
    vi.stubEnv("FINNHUB_API_KEY", "test-key")
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("prefers the TTM yield, falling back to indicated annual", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ metric: { currentDividendYieldTTM: 0.55 } }),
      ),
    )
    await expect(fetchFinnhubDividendYield("AAPL")).resolves.toBe(0.55)

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ metric: { dividendYieldIndicatedAnnual: 1.2 } }),
      ),
    )
    await expect(fetchFinnhubDividendYield("VTI")).resolves.toBe(1.2)
  })

  it("resolves null on missing metrics or non-OK responses — never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ metric: {} })))
    await expect(fetchFinnhubDividendYield("GOOG")).resolves.toBeNull()

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 403)))
    await expect(fetchFinnhubDividendYield("GOOG")).resolves.toBeNull()

    vi.stubEnv("FINNHUB_API_KEY", "")
    await expect(fetchFinnhubDividendYield("GOOG")).resolves.toBeNull()
  })

  it("retries 429 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({ metric: { currentDividendYieldTTM: 2 } }))
    vi.stubGlobal("fetch", fetchMock)

    const promise = fetchFinnhubDividendYield("SCHD")
    await vi.advanceTimersByTimeAsync(1200)
    await expect(promise).resolves.toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe("fetchFinnhubCryptoQuote", () => {
  beforeEach(() => {
    vi.stubEnv("FINNHUB_API_KEY", "test-key")
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("returns the latest intraday close and day change from daily candles", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ s: "ok", c: [90_000, 91_250.5] }))
      .mockResolvedValueOnce(jsonResponse({ s: "ok", c: [88_000, 90_000] }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchFinnhubCryptoQuote("BTC")).resolves.toEqual({
      price: 91_250.5,
      dayChangePct: 1.3894444444444443,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain("BINANCE%3ABTCUSDT")
  })

  it("normalizes Kraken-style aliases before lookup", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ s: "ok", c: [91_000] }))
      .mockResolvedValueOnce(jsonResponse({ s: "ok", c: [90_000, 91_000] }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchFinnhubCryptoQuote("XBT")).resolves.toEqual({
      price: 91_000,
      dayChangePct: 0,
    })
    expect(fetchMock.mock.calls[0][0]).toContain("BINANCE%3ABTCUSDT")
  })

  it("throws UnknownSymbolError when Finnhub has no candle data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ s: "no_data", c: [] }))
      .mockResolvedValueOnce(jsonResponse({ s: "ok", c: [1, 2] }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchFinnhubCryptoQuote("FAKECOIN")).rejects.toBeInstanceOf(
      UnknownSymbolError,
    )
  })
})
