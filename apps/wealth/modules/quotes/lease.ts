import "server-only"

import { createServiceClient } from "@/lib/db"
import { QUOTE_POLL_MS } from "./cache"

/**
 * Try to win the global quote-refresh lease. The single-row
 * pt_quote_refresh_lease table is stamped with an atomic conditional UPDATE:
 * only the request that moves last_run_at forward (because the previous stamp
 * is older than the poll interval) may spend Finnhub budget; every concurrent
 * poller loses the race and serves the cache the winner keeps warm.
 *
 * The lease is a timestamp, not a lock — a crashed holder never blocks the
 * next refresh, it just becomes eligible again one poll interval later.
 * Fails closed (no refresh) on database errors so an outage can't stampede
 * the rate limit.
 */
export async function acquireQuoteRefreshLease(): Promise<boolean> {
  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - QUOTE_POLL_MS).toISOString()

  const { data, error } = await supabase
    .from("pt_quote_refresh_lease")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", "global")
    .lt("last_run_at", cutoff)
    .select("id")

  if (error) {
    console.error(`quote refresh lease update failed: ${error.message}`)
    return false
  }
  return (data ?? []).length > 0
}
