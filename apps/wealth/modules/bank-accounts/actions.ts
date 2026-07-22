"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/db"
import type { ActionResult } from "@/lib/action-result"
import { requireOwner } from "@/modules/auth"
import type { BankAccountType } from "./types"

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
