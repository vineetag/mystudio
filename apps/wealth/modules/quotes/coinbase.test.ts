import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchCoinbaseCryptoQuote } from "./coinbase"
import { UnknownSymbolError } from "./finnhub"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("fetchCoinbaseCryptoQuote", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("returns last price and 24h change from the stats endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ open: "90000", last: "91250.5" }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchCoinbaseCryptoQuote("BTC")).resolves.toEqual({
      price: 91_250.5,
      dayChangePct: 1.3894444444444443,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain("/products/BTC-USD/stats")
  })

  it("normalizes Kraken-style aliases before lookup", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ open: "91000", last: "91000" }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchCoinbaseCryptoQuote("XBT")).resolves.toEqual({
      price: 91_000,
      dayChangePct: 0,
    })
    expect(fetchMock.mock.calls[0][0]).toContain("/products/BTC-USD/stats")
  })

  it("returns a null day change when the 24h open is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ last: "142.2" })))

    await expect(fetchCoinbaseCryptoQuote("SOL")).resolves.toEqual({
      price: 142.2,
      dayChangePct: null,
    })
  })

  it("throws UnknownSymbolError for pairs Coinbase doesn't list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "NotFound" }, 404))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchCoinbaseCryptoQuote("FAKECOIN")).rejects.toBeInstanceOf(
      UnknownSymbolError,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("throws UnknownSymbolError on a non-numeric last price", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ open: "0", last: "0" })))
    await expect(fetchCoinbaseCryptoQuote("BTC")).rejects.toBeInstanceOf(
      UnknownSymbolError,
    )
  })

  it("retries on 429 with backoff, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({ open: "100", last: "101" }))
    vi.stubGlobal("fetch", fetchMock)

    const promise = fetchCoinbaseCryptoQuote("ETH")
    await vi.advanceTimersByTimeAsync(1200)
    await expect(promise).resolves.toEqual({ price: 101, dayChangePct: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("gives up after exhausting retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 503))
    vi.stubGlobal("fetch", fetchMock)

    const promise = fetchCoinbaseCryptoQuote("BTC")
    const assertion = expect(promise).rejects.toThrow("Coinbase responded 503.")
    await vi.advanceTimersByTimeAsync(1200 + 2400)
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
