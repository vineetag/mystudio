import "server-only"

import { createClient } from "@/lib/db"
import type { ConnectionStatus, SnapTradeConnection } from "./types"

/** The owner's brokerage connections, oldest first. RLS scopes to the viewer. */
export async function listConnections(): Promise<SnapTradeConnection[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_snaptrade_connections")
    .select("id, broker, status, last_synced_at, last_error")
    .order("created_at", { ascending: true })

  if (error) {
    console.error(`pt_snaptrade_connections read failed: ${error.message}`)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    broker: row.broker,
    status: row.status as ConnectionStatus,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
  }))
}
