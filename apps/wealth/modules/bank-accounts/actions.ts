"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/db"
import type { ActionResult, ActionResultWith } from "@/lib/action-result"
import { requireOwner } from "@/modules/auth"
import { isSimpleFinConfigured } from "./simplefin"
import { syncBankAccounts } from "./sync"
import type { BankAccountType, BankSyncReport } from "./types"

/**
 * Minimum gap between manual syncs. SimpleFIN's free-tier guidance is ~24
 * requests/day; the cooldown keeps a stuck or mashed button from burning
 * through that budget.
 */
const MANUAL_SYNC_COOLDOWN_MS = 60 * 1000

const BANK_ACCOUNT_TYPES: BankAccountType[] = [
  "checking",
  "savings",
  "credit_card",
  "loan",
  "unknown",
]

/**
 * Owner override for the checking/savings guess made at first sync. Writes
 * with the service client — pt_bank_accounts has no RLS write policies, all
 * mutations are owner-guarded server actions or the sync job. A re-sync
 * never touches account_type, so the correction sticks.
 */
export async function setBankAccountType(
  id: string,
  accountType: BankAccountType,
): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  if (!BANK_ACCOUNT_TYPES.includes(accountType)) {
    return {
      ok: false,
      error: `Account type must be one of: ${BANK_ACCOUNT_TYPES.join(", ")}.`,
    }
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from("pt_bank_accounts")
    .update({ account_type: accountType })
    .eq("id", id)
    .select("id")

  if (error) {
    return { ok: false, error: `Couldn't update the account type: ${error.message}` }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Bank account not found — it may have been removed." }
  }

  revalidatePath("/")
  return { ok: true }
}

/**
 * Owner-triggered SimpleFIN sync — the escape hatch from the 6-hour TTL that
 * gates the background top-up, so a newly linked bank shows up immediately.
 * Cooldown-guarded (see MANUAL_SYNC_COOLDOWN_MS) via the newest last_synced_at
 * already in the table.
 */
export async function syncBankAccountsNow(): Promise<
  ActionResultWith<BankSyncReport>
> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  if (!isSimpleFinConfigured()) {
    return {
      ok: false,
      error: "SimpleFIN isn't configured on this deployment — nothing to sync.",
    }
  }

  const service = createServiceClient()
  const { data: newest, error: newestError } = await service
    .from("pt_bank_accounts")
    .select("last_synced_at")
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (newestError) {
    return {
      ok: false,
      error: `Couldn't check the last sync time: ${newestError.message}`,
    }
  }
  if (newest) {
    const elapsed = Date.now() - new Date(newest.last_synced_at).getTime()
    if (elapsed < MANUAL_SYNC_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((MANUAL_SYNC_COOLDOWN_MS - elapsed) / 1000)
      return {
        ok: false,
        error: `Balances were synced moments ago — try again in ${waitSeconds}s.`,
      }
    }
  }

  try {
    const report = await syncBankAccounts()
    revalidatePath("/")
    return { ok: true, data: report }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Hidden bank accounts drop out of the dashboard and the net worth total. */
export async function setBankAccountHidden(
  id: string,
  hidden: boolean,
): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const service = createServiceClient()
  const { data, error } = await service
    .from("pt_bank_accounts")
    .update({ is_hidden: hidden })
    .eq("id", id)
    .select("id")

  if (error) {
    return {
      ok: false,
      error: `Couldn't ${hidden ? "hide" : "unhide"} the account: ${error.message}`,
    }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Bank account not found — it may have been removed." }
  }

  revalidatePath("/")
  return { ok: true }
}
