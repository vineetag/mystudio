import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchFinnhubQuote, UnknownSymbolError } from "./finnhub"

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
