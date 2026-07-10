import "server-only"

import { createClient } from "@/lib/db"
import type { Snapshot } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToSnapshot(row: any): Snapshot {
  return {
    snapshotDate: row.snapshot_date,
    totalValue: Number(row.total_value),
    perAccount: Array.isArray(row.per_account) ? row.per_account : [],
    spyClose: row.spy_close === null ? null : Number(row.spy_close),
    qqqClose: row.qqq_close === null ? null : Number(row.qqq_close),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Snapshot history, oldest first. Reads with the viewer's own client — RLS
 * only exposes pt_snapshots to authenticated users, so demo mode gets [].
 */
export async function listSnapshots(rangeDays: number): Promise<Snapshot[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - rangeDays)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_snapshots")
    .select("snapshot_date, total_value, per_account, spy_close, qqq_close")
    .gte("snapshot_date", since.toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: true })

  if (error) {
    // History is an enhancement — a read failure must not break the dashboard.
    console.error(`pt_snapshots read failed: ${error.message}`)
    return []
  }
  return (data ?? []).map(rowToSnapshot)
}
