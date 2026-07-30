import "server-only"

import { createServiceClient } from "@/lib/db"
import { fetchSimpleFinAccounts, type SimpleFinAccount } from "./simplefin"
import type { BankAccountType, BankSyncReport } from "./types"

/** Refresh balances at most every 6 hours (daily cron + on-visit top-ups). */
export const BANK_SYNC_TTL_MS = 6 * 60 * 60 * 1000

/**
 * Best-effort type guess — SimpleFIN has no native type field, and returns
 * every linked account (credit cards and loans included, not just deposit
 * accounts). Name signals first; a negative balance is how SimpleFIN reports
 * money owed, so it falls back to credit_card. Applied only when a row is
 * first inserted — the owner's manual correction in the UI is never
 * overwritten by a re-sync.
 */
export function guessAccountType(
  accountName: string,
  balance: number,
): BankAccountType {
  if (/mortgage|loan/i.test(accountName)) return "loan"
  if (/card|credit/i.test(accountName)) return "credit_card"
  if (/sav/i.test(accountName)) return "savings"
  if (balance < 0) return "credit_card"
  return "checking"
}

export interface BankAccountRow {
  simplefin_account_id: string
  institution_name: string
  account_name: string
  currency: string
  balance: number
  available_balance: number | null
  balance_date: string | null
  last_synced_at: string
}

function toBalance(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Map SimpleFIN accounts to pt_bank_accounts rows. Accounts without a usable
 * id or balance are skipped with a reason (reported alongside SimpleFIN's own
 * errors array so nothing fails silently).
 */
export function mapSimpleFinAccounts(
  accounts: SimpleFinAccount[],
  syncedAt: string = new Date().toISOString(),
): { rows: BankAccountRow[]; skipped: string[] } {
  const rows: BankAccountRow[] = []
  const skipped: string[] = []

  for (const account of accounts ?? []) {
    const id = typeof account?.id === "string" ? account.id.trim() : ""
    if (!id) {
      skipped.push(`${account?.name ?? "unnamed account"}: no SimpleFIN account id`)
      continue
    }
    const balance = toBalance(account.balance)
    if (balance === null) {
      skipped.push(`${account.name ?? id}: unreadable balance "${account.balance}"`)
      continue
    }
    const balanceDate =
      typeof account["balance-date"] === "number"
        ? new Date(account["balance-date"] * 1000).toISOString()
        : null

    rows.push({
      simplefin_account_id: id,
      institution_name: account.org?.name?.trim() || account.org?.domain || "Unknown bank",
      account_name: account.name?.trim() || "Unnamed account",
      currency: account.currency?.trim() || "USD",
      balance,
      available_balance: toBalance(account["available-balance"]),
      balance_date: balanceDate,
      last_synced_at: syncedAt,
    })
  }

  return { rows, skipped }
}

/**
 * Persist the warnings from a sync so the dashboard can show them on page
 * load, not just in the response to a manual sync. A failure to write health
 * must never fail the sync itself — the balances are the point.
 */
async function recordSyncHealth(
  service: ReturnType<typeof createServiceClient>,
  errors: string[],
): Promise<void> {
  const { error } = await service
    .from("pt_bank_sync_health")
    .upsert({ id: true, errors, synced_at: new Date().toISOString() })
  if (error) {
    console.error(`Couldn't record bank sync health: ${error.message}`)
  }
}

/**
 * Pull balances from SimpleFIN and upsert into pt_bank_accounts, keyed on
 * simplefin_account_id. New accounts get a type guess; existing rows keep
 * their (possibly owner-corrected) account_type and is_hidden untouched.
 * SimpleFIN's errors array is returned, logged, and persisted — never
 * swallowed. It is the only signal that a connection has gone stale: bad
 * connections keep serving cached balances, so nothing else throws.
 */
export async function syncBankAccounts(): Promise<BankSyncReport> {
  const service = createServiceClient()
  const accountSet = await fetchSimpleFinAccounts()

  if (accountSet.errors.length > 0) {
    // SimpleFIN uses this for stale-connection and rate-limit warnings.
    console.error(`SimpleFIN reported errors: ${accountSet.errors.join(" | ")}`)
  }

  const { rows, skipped } = mapSimpleFinAccounts(accountSet.accounts)
  if (skipped.length > 0) {
    console.error(`SimpleFIN sync skipped accounts: ${skipped.join(" | ")}`)
  }

  const report: BankSyncReport = {
    accounts: rows.length,
    inserted: 0,
    updated: 0,
    simplefinErrors: [...accountSet.errors, ...skipped],
  }
  // Written before the upserts so a warning survives even if a write below
  // throws — a failing sync is exactly when the owner needs to see why.
  await recordSyncHealth(service, report.simplefinErrors)

  if (rows.length === 0) return report

  const { data: existing, error: existingError } = await service
    .from("pt_bank_accounts")
    .select("simplefin_account_id")
  if (existingError) {
    throw new Error(`Couldn't read existing bank accounts: ${existingError.message}`)
  }
  const existingIds = new Set(
    (existing ?? []).map((row) => row.simplefin_account_id as string),
  )

  const toInsert = rows
    .filter((row) => !existingIds.has(row.simplefin_account_id))
    .map((row) => ({
      ...row,
      account_type: guessAccountType(row.account_name, row.balance),
    }))
  const toUpdate = rows.filter((row) => existingIds.has(row.simplefin_account_id))

  if (toInsert.length > 0) {
    const { error } = await service.from("pt_bank_accounts").insert(toInsert)
    if (error) throw new Error(`Couldn't insert bank accounts: ${error.message}`)
    report.inserted = toInsert.length
  }

  // Per-row updates (not a bulk upsert) so account_type and is_hidden are
  // never part of the write for existing rows.
  for (const row of toUpdate) {
    const { error } = await service
      .from("pt_bank_accounts")
      .update({
        institution_name: row.institution_name,
        account_name: row.account_name,
        currency: row.currency,
        balance: row.balance,
        available_balance: row.available_balance,
        balance_date: row.balance_date,
        last_synced_at: row.last_synced_at,
      })
      .eq("simplefin_account_id", row.simplefin_account_id)
    if (error) {
      throw new Error(
        `Couldn't update bank account ${row.simplefin_account_id}: ${error.message}`,
      )
    }
    report.updated++
  }

  return report
}
