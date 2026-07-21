import "server-only"

import { inferAssetClass, type AssetClass } from "@/modules/holdings"
import { createServiceClient } from "@/lib/db"
import { cryptoSymbolProfile } from "./crypto-metadata"
import { fetchSymbolProfile } from "./profile"
import type { SymbolInfo } from "./types"

// Names come from Finnhub, which shares the 60 calls/min free-tier budget with
// quotes — one request per ~1.1s keeps us under the cap. Each symbol is fetched
// at most once ever (cached in pt_symbols), so this cost is one-time.
const FINNHUB_MIN_INTERVAL_MS = 1_100

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToSymbolInfo(row: any): SymbolInfo {
  return {
    symbol: row.symbol,
    name: row.name ?? null,
    domain: row.domain ?? null,
    sector: row.sector ?? null,
    nameSource: (row.name_source as SymbolInfo["nameSource"]) ?? "logodev",
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function unresolved(symbol: string): SymbolInfo {
  return { symbol, name: null, domain: null, sector: null, nameSource: "logodev" }
}

export interface GetSymbolsOptions {
  /**
   * Resolve names for symbols not yet cached via Finnhub (default true). Set
   * false for a fast, cache-only read on the render path and warm the cache
   * separately (e.g. in `after()`), since resolution is rate-paced.
   */
  fetchMissing?: boolean
  /**
   * Per-symbol routing: crypto symbols resolve from the static crypto map
   * (Finnhub profile2 is equity-only and returns whatever company shares the
   * ticker — SOL → Emeren Group), equities from Finnhub.
   */
  assetClasses?: Map<string, AssetClass>
}

/**
 * Resolve display metadata for a set of symbols — one SymbolInfo per unique
 * symbol. Cache-first from pt_symbols (shared by live and demo); rows missing
 * entirely are resolved once from Finnhub and upserted. Existing rows are never
 * overwritten, so an owner's manual name survives every refresh.
 *
 * Never throws — a cache/network failure degrades to name/domain null so the
 * ticker (and its by-ticker logo) still render.
 */
export async function getSymbols(
  symbols: string[],
  options: GetSymbolsOptions = {},
): Promise<Map<string, SymbolInfo>> {
  const unique = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase())),
  ].filter((symbol) => symbol.length > 0)

  const infos = new Map<string, SymbolInfo>()
  if (unique.length === 0) return infos

  // Service client, not the cookie-bound one: pt_symbols is world-readable
  // (RLS opens reads to everyone), and the cookie-bound client breaks inside
  // after() — Next.js forbids cookies() there, which silently killed the
  // background name warm on every page load.
  const supabase = createServiceClient()
  const { data: rows, error } = await supabase
    .from("pt_symbols")
    .select("symbol, name, domain, sector, name_source, profile_fetched_at")
    .in("symbol", unique)

  if (error) {
    console.error(`pt_symbols read failed: ${error.message}`)
    for (const symbol of unique) infos.set(symbol, unresolved(symbol))
    return infos
  }

  const cached = new Map(
    (rows ?? []).map((row) => [row.symbol as string, rowToSymbolInfo(row)]),
  )
  for (const [symbol, info] of cached) infos.set(symbol, info)

  const missing = unique.filter((symbol) => !cached.has(symbol))
  // Default every known-missing symbol to "no metadata" so the map is complete
  // even if resolution is skipped or fails.
  for (const symbol of missing) infos.set(symbol, unresolved(symbol))

  // Rows written before sectors existed have no profile_fetched_at stamp: each
  // gets exactly one backfill attempt, then is stamped whether or not Finnhub
  // could classify it, so an unclassifiable fund is never re-fetched.
  const needsSector = (rows ?? [])
    .filter((row) => row.profile_fetched_at === null)
    .map((row) => row.symbol as string)

  const toResolve = [...missing, ...needsSector]
  if (options.fetchMissing === false || toResolve.length === 0) return infos

  // Resolve serially with pacing to respect the Finnhub rate limit, upserting
  // each row as we go so partial progress persists if the run is interrupted.
  // Crypto symbols come from the static map — no Finnhub call, no pacing.
  const service = createServiceClient()
  let finnhubCalls = 0
  for (const symbol of toResolve) {
    const isCrypto =
      inferAssetClass(symbol, options.assetClasses?.get(symbol) ?? "equity") ===
      "crypto"

    let profile
    if (isCrypto) {
      profile = cryptoSymbolProfile(symbol)
    } else {
      if (finnhubCalls > 0) await sleep(FINNHUB_MIN_INTERVAL_MS)
      finnhubCalls++
      profile = await fetchSymbolProfile(symbol)
    }
    const existing = cached.get(symbol)
    const now = new Date().toISOString()

    if (profile) {
      infos.set(symbol, {
        symbol,
        // A backfill must not overwrite what the row already has — the owner's
        // manual name lives there. Only the sector is genuinely new.
        name: existing?.name ?? profile.name,
        domain: existing?.domain ?? profile.domain,
        sector: profile.sector,
        nameSource: existing?.nameSource ?? "logodev",
      })
    } else if (existing) {
      infos.set(symbol, { ...existing, sector: null })
    }

    if (existing) {
      // Sector-only backfill on an existing row. Name/domain are left alone;
      // filling them here would clobber a manual name.
      const { error: updateError } = await service
        .from("pt_symbols")
        .update({ sector: profile?.sector ?? null, profile_fetched_at: now })
        .eq("symbol", symbol)
      if (updateError) {
        console.error(
          `pt_symbols sector backfill failed for ${symbol}: ${updateError.message}`,
        )
      }
      continue
    }

    // ignoreDuplicates: never clobber a row (esp. a manual name) written by a
    // concurrent request between our read and this write.
    const { error: upsertError } = await service.from("pt_symbols").upsert(
      {
        symbol,
        name: profile?.name ?? null,
        domain: profile?.domain ?? null,
        sector: profile?.sector ?? null,
        name_source: "logodev",
        fetched_at: now,
        profile_fetched_at: now,
      },
      { onConflict: "symbol", ignoreDuplicates: true },
    )
    if (upsertError) {
      console.error(`pt_symbols upsert failed for ${symbol}: ${upsertError.message}`)
    }
  }

  return infos
}
