import { normalizeCryptoSymbol } from "@/modules/holdings"
import type { SymbolProfile } from "./profile"

// Static display metadata for crypto symbols. Finnhub's profile2 endpoint is
// equity-only — for a crypto ticker it returns whatever company happens to
// share the symbol (SOL → Emeren Group, ETH → Ethan Allen), so crypto names
// must never come from there. The domain drives the logo.dev image, which
// resolves each project's official site to its brand mark.

/** Every coin lands in one bucket — Finnhub has no sector for crypto. */
export const CRYPTO_SECTOR = "Cryptocurrency"

const CRYPTO_METADATA: Record<string, Omit<SymbolProfile, "sector">> = {
  ADA: { name: "Cardano", domain: "cardano.org" },
  ALGO: { name: "Algorand", domain: "algorand.com" },
  APT: { name: "Aptos", domain: "aptosfoundation.org" },
  ARB: { name: "Arbitrum", domain: "arbitrum.io" },
  ATOM: { name: "Cosmos", domain: "cosmos.network" },
  AVAX: { name: "Avalanche", domain: "avax.network" },
  BCH: { name: "Bitcoin Cash", domain: "bitcoincash.org" },
  BTC: { name: "Bitcoin", domain: "bitcoin.org" },
  DOGE: { name: "Dogecoin", domain: "dogecoin.com" },
  DOT: { name: "Polkadot", domain: "polkadot.network" },
  ETC: { name: "Ethereum Classic", domain: "ethereumclassic.org" },
  ETH: { name: "Ethereum", domain: "ethereum.org" },
  LINK: { name: "Chainlink", domain: "chain.link" },
  LTC: { name: "Litecoin", domain: "litecoin.org" },
  MATIC: { name: "Polygon", domain: "polygon.technology" },
  NEAR: { name: "NEAR Protocol", domain: "near.org" },
  OP: { name: "Optimism", domain: "optimism.io" },
  PEPE: { name: "Pepe", domain: null },
  SHIB: { name: "Shiba Inu", domain: "shibatoken.com" },
  SOL: { name: "Solana", domain: "solana.com" },
  SUI: { name: "Sui", domain: "sui.io" },
  UNI: { name: "Uniswap", domain: "uniswap.org" },
  XLM: { name: "Stellar", domain: "stellar.org" },
  XRP: { name: "XRP", domain: "ripple.com" },
}

/**
 * Display metadata for a crypto symbol (broker aliases like XBT normalized
 * first). Null for a coin not in the map — the ticker still renders, same as
 * an unresolvable fund.
 */
export function cryptoSymbolProfile(symbol: string): SymbolProfile | null {
  const profile = CRYPTO_METADATA[normalizeCryptoSymbol(symbol)]
  return profile ? { ...profile, sector: CRYPTO_SECTOR } : null
}
