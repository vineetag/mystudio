"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/db"
import type { ActionResult } from "@/lib/action-result"
import { requireOwner } from "@/modules/auth"
import type { AccountType } from "./types"

const ACCOUNT_TYPES: AccountType[] = [
  "taxable",
  "401k",
  "roth_ira",
  "brokerage_link",
]

export interface AccountInput {
  name: string
  broker: string
  accountType: AccountType
}

function validateAccountInput(input: AccountInput): string | null {
  const name = input.name.trim()
  const broker = input.broker.trim()
  if (name.length < 1 || name.length > 100) {
    return "Account name must be between 1 and 100 characters."
  }
  if (broker.length < 1 || broker.length > 100) {
    return "Broker must be between 1 and 100 characters."
  }
  if (!ACCOUNT_TYPES.includes(input.accountType)) {
    return `Account type must be one of: ${ACCOUNT_TYPES.join(", ")}.`
  }
  return null
}

export async function createAccount(input: AccountInput): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const invalid = validateAccountInput(input)
  if (invalid) return { ok: false, error: invalid }

  const supabase = await createClient()
  const { error } = await supabase.from("pt_accounts").insert({
    user_id: owner.userId,
    name: input.name.trim(),
    broker: input.broker.trim(),
    account_type: input.accountType,
    source: "manual",
  })

  if (error) {
    return { ok: false, error: `Couldn't create the account: ${error.message}` }
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { ok: true }
}

export async function updateAccount(
  id: string,
  input: AccountInput,
): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const invalid = validateAccountInput(input)
  if (invalid) return { ok: false, error: invalid }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_accounts")
    .update({
      name: input.name.trim(),
      broker: input.broker.trim(),
      account_type: input.accountType,
    })
    .eq("id", id)
    .select("id")

  if (error) {
    return { ok: false, error: `Couldn't update the account: ${error.message}` }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Account not found — it may have been deleted." }
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { ok: true }
}

/** Deletes the account and, via FK cascade, all its holdings. */
export async function deleteAccount(id: string): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_accounts")
    .delete()
    .eq("id", id)
    .select("id")

  if (error) {
    return { ok: false, error: `Couldn't delete the account: ${error.message}` }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Account not found — it may already be deleted." }
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { ok: true }
}
