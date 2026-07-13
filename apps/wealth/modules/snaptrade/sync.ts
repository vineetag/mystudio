import "server-only"

import { createServiceClient } from "@/lib/db"
import type { AssetClass } from "@/modules/holdings/asset-class"
import {
  getSnapTradeClient,
  snapTradeErrorMessage,
  withSnapTradeRetry,
} from "./client"
import type { StUser } from "./users"
import type { SyncReport } from "./types"

interface HoldingRow {
  symbol: string
  asset_class: AssetClass
  quantity: number
  avg_cost: number | null
}

/**
 * Map SnapTrade positions to pt_holdings rows, respecting the same DB
 * constraints manual entry has (upper-case symbol ≤ 12 chars, quantity > 0).
 * Unusable rows are skipped with a reason, mirroring the CSV import report.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function isCryptoPosition(position: any): boolean {
  if (position?.instrument?.kind === "crypto") return true
  const typeCode: unknown = position?.symbol?.symbol?.type?.code
  return typeCode === "crypto"
}

export function mapPositions(positions: any[]): {
  rows: HoldingRow[]
  skipped: string[]
} {
  const rows: HoldingRow[] = []
  const skipped: string[] = []

  for (const position of positions ?? []) {
    const rawSymbol: unknown =
      position?.instrument?.raw_symbol ??
      position?.symbol?.symbol?.raw_symbol ??
      position?.symbol?.symbol?.symbol
    const units: unknown = position?.units
    const avgCost: unknown = position?.average_purchase_price

    const symbol = typeof rawSymbol === "string" ? rawSymbol.trim().toUpperCase() : ""
    if (!symbol || symbol.length > 12 || !/^[A-Z0-9.\-]+$/.test(symbol)) {
      skipped.push(`${symbol || "unknown symbol"}: no usable ticker symbol`)
      continue
    }
    if (typeof units !== "number" || !(units > 0)) {
      skipped.push(`${symbol}: non-positive or missing quantity (short positions aren't tracked)`)
      continue
    }

    rows.push({
      symbol,
      asset_class: isCryptoPosition(position) ? "crypto" : "equity",
      quantity: units,
      avg_cost: typeof avgCost === "number" && avgCost >= 0 ? avgCost : null,
    })
  }

  // One row per symbol (DB unique constraint): merge duplicates by summing
  // quantity and cost-weighting the basis where both sides have one.
  const bySymbol = new Map<string, HoldingRow>()
  for (const row of rows) {
    const existing = bySymbol.get(row.symbol)
    if (!existing) {
      bySymbol.set(row.symbol, row)
      continue
    }
    const mergedQty = existing.quantity + row.quantity
    existing.avg_cost =
      existing.avg_cost !== null && row.avg_cost !== null
        ? (existing.avg_cost * existing.quantity + row.avg_cost * row.quantity) / mergedQty
        : null
    existing.quantity = mergedQty
    if (row.asset_class === "crypto") existing.asset_class = "crypto"
  }

  return { rows: [...bySymbol.values()], skipped }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Pull every SnapTrade connection, its accounts, and their positions into
 * pt_snaptrade_connections / pt_accounts (source='snaptrade') / pt_holdings.
 *
 * Read-only by design — positions in, nothing out. Per-connection failures
 * are recorded on the connection row (status='error', last_error) and never
 * abort the other connections.
 */
export async function syncSnapTradeHoldings(
  userId: string,
  stUser: StUser,
): Promise<SyncReport> {
  const snaptrade = getSnapTradeClient()
  const service = createServiceClient()
  const auth = { userId: stUser.stUserId, userSecret: stUser.stUserSecret }

  const [connectionsResponse, accountsResponse] = await Promise.all([
    withSnapTradeRetry(() => snaptrade.connections.listBrokerageAuthorizations(auth)),
    withSnapTradeRetry(() => snaptrade.accountInformation.listUserAccounts(auth)),
  ])
  const connections = connectionsResponse.data ?? []
  const stAccounts = accountsResponse.data ?? []

  const report: SyncReport = { connections: 0, accounts: 0, holdings: 0, skipped: [] }

  for (const connection of connections) {
    if (!connection.id) continue
    report.connections++

    const broker =
      connection.brokerage?.display_name ?? connection.name ?? "Unknown broker"
    // SnapTrade ships an official brokerage logo — capture it for the UI.
    const brokerLogoUrl: string | null =
      connection.brokerage?.aws_s3_logo_url ??
      connection.brokerage?.logo_url ??
      null
    const markConnection = async (
      status: "connected" | "error" | "disabled",
      lastError: string | null,
    ) => {
      await service.from("pt_snaptrade_connections").upsert(
        {
          id: connection.id,
          user_id: userId,
          broker,
          logo_url: brokerLogoUrl,
          status,
          last_error: lastError,
          ...(status === "connected" ? { last_synced_at: new Date().toISOString() } : {}),
        },
        { onConflict: "id" },
      )
    }

    if (connection.disabled) {
      await markConnection(
        "disabled",
        "SnapTrade reports this connection as disabled — reconnect to resume syncing.",
      )
      continue
    }

    try {
      const connectionAccounts = stAccounts.filter(
        (account) => account.brokerage_authorization === connection.id,
      )

      for (const stAccount of connectionAccounts) {
        const positionsResponse = await withSnapTradeRetry(() =>
          snaptrade.accountInformation.getUserAccountPositions({
            ...auth,
            accountId: stAccount.id,
          }),
        )
        const { rows, skipped } = mapPositions(positionsResponse.data ?? [])
        report.skipped.push(...skipped)

        // Upsert the account by its stable SnapTrade id. account_type stays
        // whatever the owner set (default taxable on first sync) — SnapTrade
        // doesn't reliably know 401k vs taxable.
        const { data: accountRow, error: accountError } = await service
          .from("pt_accounts")
          .upsert(
            {
              snaptrade_account_id: stAccount.id,
              user_id: userId,
              name: stAccount.name ?? `${broker} ${stAccount.number ?? ""}`.trim(),
              broker: stAccount.institution_name ?? broker,
              broker_logo_url: brokerLogoUrl,
              source: "snaptrade",
            },
            { onConflict: "snaptrade_account_id" },
          )
          .select("id")
          .single()
        if (accountError || !accountRow) {
          throw new Error(
            `Couldn't upsert account "${stAccount.name}": ${accountError?.message ?? "no row"}`,
          )
        }
        report.accounts++

        // Positions are a full snapshot per account: replace, don't merge.
        const { error: deleteError } = await service
          .from("pt_holdings")
          .delete()
          .eq("account_id", accountRow.id)
        if (deleteError) {
          throw new Error(`Couldn't clear old holdings: ${deleteError.message}`)
        }
        if (rows.length > 0) {
          const { error: insertError } = await service.from("pt_holdings").insert(
            rows.map((row) => ({ ...row, account_id: accountRow.id })),
          )
          if (insertError) {
            throw new Error(`Couldn't insert holdings: ${insertError.message}`)
          }
          report.holdings += rows.length
        }
      }

      await markConnection("connected", null)
    } catch (error) {
      await markConnection("error", snapTradeErrorMessage(error))
    }
  }

  return report
}
