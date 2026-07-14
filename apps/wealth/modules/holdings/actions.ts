"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/db"
import type { ActionResult, ActionResultWith } from "@/lib/action-result"
import { requireOwner } from "@/modules/auth"
import { parseHoldingsCsv, type CsvReject } from "./csv"
import {
  normalizeSymbol,
  validateAvgCost,
  validateQuantity,
  validateSymbol,
} from "./validate"
import { inferAssetClass } from "./asset-class"

export interface HoldingInput {
  symbol: string
  quantity: number
  /** Null = no cost basis (401k transfer) — excluded from gain/loss math. */
  avgCost: number | null
}

function validateHoldingInput(input: HoldingInput): string | null {
  return (
    validateSymbol(normalizeSymbol(input.symbol)) ??
    validateQuantity(input.quantity) ??
    validateAvgCost(input.avgCost)
  )
}

export async function addHolding(
  accountId: string,
  input: HoldingInput,
): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const invalid = validateHoldingInput(input)
  if (invalid) return { ok: false, error: invalid }

  const symbol = normalizeSymbol(input.symbol)
  const supabase = await createClient()
  const { error } = await supabase.from("pt_holdings").insert({
    account_id: accountId,
    symbol,
    asset_class: inferAssetClass(symbol, "equity"),
    quantity: input.quantity,
    avg_cost: input.avgCost,
  })

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: `${symbol} already exists in this account — edit the existing row instead.`,
      }
    }
    return { ok: false, error: `Couldn't add the holding: ${error.message}` }
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { ok: true }
}

export async function updateHolding(
  id: string,
  input: Omit<HoldingInput, "symbol">,
): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const invalid = validateQuantity(input.quantity) ?? validateAvgCost(input.avgCost)
  if (invalid) return { ok: false, error: invalid }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_holdings")
    .update({ quantity: input.quantity, avg_cost: input.avgCost })
    .eq("id", id)
    .select("id")

  if (error) {
    return { ok: false, error: `Couldn't update the holding: ${error.message}` }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Holding not found — it may have been deleted." }
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteHolding(id: string): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_holdings")
    .delete()
    .eq("id", id)
    .select("id")

  if (error) {
    return { ok: false, error: `Couldn't delete the holding: ${error.message}` }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Holding not found — it may already be deleted." }
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { ok: true }
}

export interface CsvImportReport {
  /** Rows inserted as new holdings. */
  imported: number
  /** Rows that replaced an existing (account, symbol) position. */
  updated: number
  rejects: CsvReject[]
}

/**
 * Import holdings from CSV text (client reads the file, sends the text).
 * Valid rows upsert on (account, symbol) — an existing position is replaced,
 * not duplicated. Invalid rows are rejected individually with the line number
 * and reason; one bad row never blocks the rest.
 */
export async function importHoldingsCsv(
  csvText: string,
): Promise<ActionResultWith<CsvImportReport>> {
  const owner = await requireOwner()
  if (!owner.ok) return owner

  if (csvText.length > 1_000_000) {
    return { ok: false, error: "File is too large — the limit is 1 MB." }
  }

  const { rows, rejects: parseRejects, fileError } = parseHoldingsCsv(csvText)
  if (fileError) return { ok: false, error: fileError }

  const supabase = await createClient()

  // Resolve account names → ids (owner's live accounts only; RLS also lets us
  // read demo rows, so filter them out explicitly).
  const { data: accounts, error: accountsError } = await supabase
    .from("pt_accounts")
    .select("id, name")
    .eq("is_demo", false)

  if (accountsError) {
    return { ok: false, error: `Couldn't load your accounts: ${accountsError.message}` }
  }

  const accountIdByName = new Map(
    (accounts ?? []).map((account) => [account.name.toLowerCase(), account.id]),
  )

  const rejects: CsvReject[] = [...parseRejects]
  const validRows = rows.filter((row) => {
    const accountId = accountIdByName.get(row.accountName.toLowerCase())
    if (!accountId) {
      rejects.push({
        line: row.line,
        raw: `${row.accountName},${row.symbol},${row.quantity},${row.avgCost ?? ""}`,
        reason: `No account named "${row.accountName}" exists — create it first or fix the name.`,
      })
      return false
    }
    return true
  })

  if (validRows.length === 0) {
    return { ok: true, data: { imported: 0, updated: 0, rejects } }
  }

  // Count which rows will update an existing position (for the report).
  const accountIds = [
    ...new Set(
      validRows.map((row) => accountIdByName.get(row.accountName.toLowerCase())!),
    ),
  ]
  const { data: existing, error: existingError } = await supabase
    .from("pt_holdings")
    .select("account_id, symbol")
    .in("account_id", accountIds)

  if (existingError) {
    return { ok: false, error: `Couldn't check existing holdings: ${existingError.message}` }
  }

  const existingKeys = new Set(
    (existing ?? []).map((row) => `${row.account_id}:${row.symbol}`),
  )

  let imported = 0
  let updated = 0
  const upsertRows = validRows.map((row) => {
    const accountId = accountIdByName.get(row.accountName.toLowerCase())!
    if (existingKeys.has(`${accountId}:${row.symbol}`)) {
      updated++
    } else {
      imported++
    }
    return {
      account_id: accountId,
      symbol: row.symbol,
      asset_class: inferAssetClass(row.symbol, "equity"),
      quantity: row.quantity,
      avg_cost: row.avgCost,
    }
  })

  const { error: upsertError } = await supabase
    .from("pt_holdings")
    .upsert(upsertRows, { onConflict: "account_id,symbol" })

  if (upsertError) {
    return { ok: false, error: `Import failed while saving: ${upsertError.message}` }
  }

  revalidatePath("/accounts")
  revalidatePath("/")
  return { ok: true, data: { imported, updated, rejects } }
}
