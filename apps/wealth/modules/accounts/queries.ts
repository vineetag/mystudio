import "server-only"

import { createClient } from "@/lib/db"
import type { Holding } from "@/modules/holdings"
import type { Account, AccountSource, AccountType } from "./types"

export interface AccountWithHoldings extends Account {
  holdings: Holding[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rowToAccount(row: any): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    broker: row.broker,
    accountType: row.account_type as AccountType,
    source: row.source as AccountSource,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToHolding(row: any): Holding {
  return {
    id: row.id,
    accountId: row.account_id,
    symbol: row.symbol,
    // Postgres numeric arrives as string — normalize to number.
    quantity: Number(row.quantity),
    avgCost: row.avg_cost === null ? null : Number(row.avg_cost),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * The owner's live accounts with their holdings. Explicitly excludes demo
 * rows — RLS makes those readable to everyone, but the management page is
 * for real data only.
 */
export async function listOwnerAccountsWithHoldings(): Promise<
  AccountWithHoldings[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_accounts")
    .select("*, pt_holdings(*)")
    .eq("is_demo", false)
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to load accounts: ${error.message}`)

  return (data ?? []).map((row) => ({
    ...rowToAccount(row),
    holdings: (row.pt_holdings ?? [])
      .map(rowToHolding)
      .sort((a: Holding, b: Holding) => a.symbol.localeCompare(b.symbol)),
  }))
}
