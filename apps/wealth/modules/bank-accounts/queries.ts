import "server-only"

import { createClient } from "@/lib/db"
import type { BankAccount, BankAccountType, BankSyncHealth } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToBankAccount(row: any): BankAccount {
  return {
    id: row.id,
    simplefinAccountId: row.simplefin_account_id,
    institutionName: row.institution_name,
    accountName: row.account_name,
    accountType: row.account_type as BankAccountType,
    currency: row.currency,
    // Postgres numeric arrives as string — normalize to number.
    balance: Number(row.balance),
    availableBalance:
      row.available_balance === null ? null : Number(row.available_balance),
    balanceDate: row.balance_date,
    lastSyncedAt: row.last_synced_at,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Cached bank balances, grouped-friendly order (institution, then name).
 * Reads with the viewer's own client — RLS only exposes pt_bank_accounts to
 * authenticated users, so demo mode gets []. Never calls SimpleFIN.
 */
export async function getBankAccounts(): Promise<BankAccount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_bank_accounts")
    .select("*")
    .order("institution_name", { ascending: true })
    .order("account_name", { ascending: true })

  if (error) {
    // Cash is an enhancement — a read failure must not break the dashboard.
    console.error(`pt_bank_accounts read failed: ${error.message}`)
    return []
  }
  return (data ?? []).map(rowToBankAccount)
}

/**
 * Warnings from the most recent sync — SimpleFIN's own errors array plus any
 * accounts we skipped. Drives the reconnect banner. Returns null when there's
 * nothing to report, so the banner is opt-in rather than a permanent empty
 * shell. Read failures degrade to null for the same reason as above.
 */
export async function getBankSyncHealth(): Promise<BankSyncHealth | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_bank_sync_health")
    .select("errors, synced_at")
    .maybeSingle()

  if (error) {
    console.error(`pt_bank_sync_health read failed: ${error.message}`)
    return null
  }
  if (!data) return null

  // jsonb column — guard the shape rather than trusting the cast.
  const errors = Array.isArray(data.errors)
    ? data.errors.filter((entry): entry is string => typeof entry === "string")
    : []
  if (errors.length === 0) return null

  return { errors, syncedAt: data.synced_at }
}
