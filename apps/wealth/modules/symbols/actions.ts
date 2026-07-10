"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/db"
import type { ActionResult } from "@/lib/action-result"
import { requireOwner } from "@/modules/auth"

const MAX_NAME_LENGTH = 80

/**
 * Owner-set official name for a symbol (funds logo.dev can't resolve, etc.).
 * Persisted in pt_symbols with name_source='manual' so the logo.dev refresh in
 * getSymbols never overwrites it, and it survives SnapTrade re-syncs (it lives
 * on the shared symbol row, not the delete-replaced pt_holdings).
 *
 * Uses the service client after an app-layer owner check — pt_symbols has no
 * client write policy (RLS), matching the pt_quotes cache model.
 */
export async function setSymbolName(
  symbol: string,
  name: string,
): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const normalized = symbol.trim().toUpperCase()
  if (!/^[A-Z0-9.\-]{1,12}$/.test(normalized)) {
    return { ok: false, error: `"${symbol}" isn't a valid ticker symbol.` }
  }

  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return { ok: false, error: "Enter a name for this holding." }
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Name is too long — keep it under ${MAX_NAME_LENGTH} characters.`,
    }
  }

  const service = createServiceClient()

  // Preserve any resolved domain so the existing logo keeps working.
  const { data: existing } = await service
    .from("pt_symbols")
    .select("domain")
    .eq("symbol", normalized)
    .maybeSingle()

  const { error } = await service.from("pt_symbols").upsert(
    {
      symbol: normalized,
      name: trimmed,
      domain: existing?.domain ?? null,
      name_source: "manual",
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "symbol" },
  )

  if (error) {
    return { ok: false, error: `Couldn't save the name: ${error.message}` }
  }

  // The name shows on both the dashboard and the accounts page.
  revalidatePath("/")
  revalidatePath("/accounts")
  return { ok: true }
}
