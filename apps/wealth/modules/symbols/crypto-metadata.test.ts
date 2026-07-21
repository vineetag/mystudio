import { describe, expect, it } from "vitest"
import { CRYPTO_ONLY_SYMBOLS } from "@/modules/holdings"
import { cryptoSymbolProfile } from "./crypto-metadata"

describe("cryptoSymbolProfile", () => {
  it("resolves names for BTC and SOL (equity-ticker collisions)", () => {
    expect(cryptoSymbolProfile("BTC")).toEqual({
      name: "Bitcoin",
      domain: "bitcoin.org",
      sector: "Cryptocurrency",
    })
    expect(cryptoSymbolProfile("SOL")).toEqual({
      name: "Solana",
      domain: "solana.com",
      sector: "Cryptocurrency",
    })
  })

  it("normalizes broker aliases before lookup", () => {
    expect(cryptoSymbolProfile("XBT")?.name).toBe("Bitcoin")
    expect(cryptoSymbolProfile("btc")?.name).toBe("Bitcoin")
  })

  it("covers every symbol the asset-class inference treats as crypto", () => {
    for (const symbol of CRYPTO_ONLY_SYMBOLS) {
      expect(cryptoSymbolProfile(symbol), symbol).not.toBeNull()
    }
  })

  it("returns null for coins not in the map", () => {
    expect(cryptoSymbolProfile("FAKECOIN")).toBeNull()
  })
})
