import "server-only"

import { createServiceClient } from "@/lib/db"
import { rowToAccount, rowToHolding } from "@/modules/accounts"
import { derivePositions, portfolioTotal } from "@/modules/portfolio"
import { getQuotes, type GetQuotesOptions } from "@/modules/quotes"
import type { SnapshotAccountValue } from "./types"

/** Benchmark ETF proxies stored with every snapshot for the comparison chart. */
const BENCHMARKS = ["SPY", "QQQ"] as const

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Value the owner's live portfolio right now and upsert today's pt_snapshots
 * row (date PK — idempotent, later runs the same day win).
 *
 * Runs from two places:
 * - the CRON_SECRET-guarded route (no session → quotes fetched as trusted)
 * - dashboard load for the signed-in owner (viewer check already passed)
 *
 * Reads via the service client because the cron has no user session.
 */
export async function captureSnapshot(
  quoteOptions: GetQuotesOptions = {},
): Promise<{ ok: true; totalValue: number } | { ok: false; error: string }> {
  const service = createServiceClient()

  const { data, error } = await service
    .from("pt_accounts")
    .select("*, pt_holdings(*)")
    .eq("is_demo", false)

  if (error) return { ok: false, error: `Snapshot account read failed: ${error.message}` }

  const accounts = (data ?? []).map((row) => ({
    ...rowToAccount(row),
    holdings: ((row.pt_holdings ?? []) as unknown[]).map(rowToHolding),
  }))

  const symbols = accounts.flatMap((account) =>
    account.holdings.map((holding) => holding.symbol),
  )
  const quotes = await getQuotes([...symbols, ...BENCHMARKS], quoteOptions)

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
