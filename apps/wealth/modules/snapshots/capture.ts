import "server-only"

import { createServiceClient } from "@/lib/db"
import { rowToAccount, rowToHolding } from "@/modules/accounts"
import { assetClassMapFromAccounts } from "@/modules/holdings"
import { derivePositions, portfolioTotal } from "@/modules/portfolio"
import { getQuotes } from "@/modules/quotes"
import type { SnapshotAccountValue } from "./types"

/** Benchmark ETF proxies stored with every snapshot for the comparison chart. */
const BENCHMARKS = ["SPY", "QQQ"] as const

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface CaptureSnapshotOptions {
  /**
   * Let the snapshot spend Finnhub budget on symbols missing the 15 min TTL.
   * Only the nightly cron sets this — it runs alone, so a paced batch there
   * can't collide with anything. Dashboard-load captures value from the
   * cache the minute-poll keeps warm: an unpaced batch here raced the
   * lease-held /api/quotes batch and 429'd both.
   */
  refreshQuotes?: boolean
}

/**
 * Value the owner's live portfolio right now and upsert today's pt_snapshots
 * row (date PK — idempotent, later runs the same day win).
 *
 * Runs from two places:
 * - the CRON_SECRET-guarded route (no session) — passes refreshQuotes
 * - dashboard load for the signed-in owner — cache-only
 *
 * Reads via the service client because the cron has no user session.
 */
export async function captureSnapshot(
  options: CaptureSnapshotOptions = {},
): Promise<{ ok: true; totalValue: number } | { ok: false; error: string }> {
  const service = createServiceClient()

  // Hidden accounts are excluded so the snapshot matches the dashboard total.
  const { data, error } = await service
    .from("pt_accounts")
    .select("*, pt_holdings(*)")
    .eq("is_demo", false)
    .eq("hidden", false)

  if (error) return { ok: false, error: `Snapshot account read failed: ${error.message}` }

  const accounts = (data ?? []).map((row) => ({
    ...rowToAccount(row),
    holdings: ((row.pt_holdings ?? []) as unknown[]).map(rowToHolding),
  }))

  const symbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )
  const assetClasses = assetClassMapFromAccounts(accounts)
  const quotes = await getQuotes(
    [...symbols, ...BENCHMARKS],
    options.refreshQuotes
      ? { assetClasses }
      : { cacheOnly: true, assetClasses },
  )

  const positions = derivePositions(accounts, quotes)
  const total = portfolioTotal(positions)

  const perAccount: SnapshotAccountValue[] = accounts.map((account) => ({
    accountId: account.id,
    name: account.name,
    value: positions
      .filter((position) => position.accountId === account.id)
      .reduce((sum, position) => sum + (position.value ?? 0), 0),
  }))

  const { error: upsertError } = await service.from("pt_snapshots").upsert(
    {
      snapshot_date: todayUtc(),
      total_value: total.value,
      per_account: perAccount,
      spy_close: quotes.get("SPY")?.price ?? null,
      qqq_close: quotes.get("QQQ")?.price ?? null,
    },
    { onConflict: "snapshot_date" },
  )

  if (upsertError) {
    return { ok: false, error: `Snapshot upsert failed: ${upsertError.message}` }
  }
  return { ok: true, totalValue: total.value }
}
