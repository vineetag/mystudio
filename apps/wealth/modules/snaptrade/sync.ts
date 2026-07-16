import "server-only"

import { createServiceClient } from "@/lib/db"
import type { AssetClass } from "@/modules/holdings"
import {
  getSnapTradeClient,
  snapTradeErrorMessage,
  withSnapTradeRetry,
} from "./client"
import { getOrRegisterStUser, type StUser } from "./users"
import type { SyncReport } from "./types"

interface HoldingRow {
  symbol: string
  asset_class: AssetClass
  quantity: number
  avg_cost: number | null
  /** Broker-reported price/NAV — the only price source for 401k funds. */
  price: number | null
  price_as_of: string | null
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

export function mapPositions(
  positions: any[],
  syncedAt: string = new Date().toISOString(),
): {
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
    const price: unknown = position?.price

    const symbol = typeof rawSymbol === "string" ? rawSymbol.trim().toUpperCase() : ""
    if (!symbol || symbol.length > 12 || !/^[A-Z0-9.\-]+$/.test(symbol)) {
      skipped.push(`${symbol || "unknown symbol"}: no usable ticker symbol`)
      continue
    }
    if (typeof units !== "number" || !(units > 0)) {
      skipped.push(`${symbol}: non-positive or missing quantity (short positions aren't tracked)`)
      continue
    }

    const brokerPrice = typeof price === "number" && price >= 0 ? price : null

    rows.push({
      symbol,
      asset_class: isCryptoPosition(position) ? "crypto" : "equity",
      quantity: units,
      avg_cost: typeof avgCost === "number" && avgCost >= 0 ? avgCost : null,
      price: brokerPrice,
      price_as_of: brokerPrice === null ? null : syncedAt,
    })
  }

  return { rows: mergeRows(rows), skipped }
}

/**
 * One row per symbol (DB unique constraint): merge duplicates by summing
 * quantity and cost-weighting the basis where both sides have one.
 */
export function mergeRows(rows: HoldingRow[]): HoldingRow[] {
  const bySymbol = new Map<string, HoldingRow>()
  for (const row of rows) {
    const existing = bySymbol.get(row.symbol)
    if (!existing) {
      bySymbol.set(row.symbol, { ...row })
      continue
    }
    const mergedQty = existing.quantity + row.quantity
    existing.avg_cost =
      existing.avg_cost !== null && row.avg_cost !== null
        ? (existing.avg_cost * existing.quantity + row.avg_cost * row.quantity) / mergedQty
        : null
    existing.quantity = mergedQty
    if (row.asset_class === "crypto") existing.asset_class = "crypto"
    // Same symbol shares one NAV; keep whichever lot actually carried a price.
    if (existing.price === null && row.price !== null) {
      existing.price = row.price
      existing.price_as_of = row.price_as_of
    }
  }
  return [...bySymbol.values()]
}

/** SnapTrade order quantities arrive as decimal strings. */
function toQuantity(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string" || value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Map still-open BUY orders to holding rows so purchases show up in the
 * portfolio immediately, before the broker reports them as positions.
 * Uses open_quantity (the unfilled remainder), so partially filled orders
 * never double-count shares that already appear in positions. Sell orders
 * are ignored — those shares remain in positions until they actually fill.
 */
export function mapOpenBuyOrders(orders: any[]): {
  rows: HoldingRow[]
  skipped: string[]
} {
  const rows: HoldingRow[] = []
  const skipped: string[] = []

  for (const order of orders ?? []) {
    const action = typeof order?.action === "string" ? order.action.toUpperCase() : ""
    if (!action.startsWith("BUY")) continue
    // Options aren't tracked as holdings — only equity/crypto buys.
    if (order?.option_symbol) {
      skipped.push(
        `${order.option_symbol?.ticker ?? "option order"}: pending option orders aren't tracked`,
      )
      continue
    }

    const rawSymbol: unknown =
      order?.universal_symbol?.raw_symbol ?? order?.universal_symbol?.symbol
    const symbol = typeof rawSymbol === "string" ? rawSymbol.trim().toUpperCase() : ""
    if (!symbol || symbol.length > 12 || !/^[A-Z0-9.\-]+$/.test(symbol)) {
      skipped.push(`${symbol || "unknown symbol"}: pending buy has no usable ticker symbol`)
      continue
    }

    const openQty =
      toQuantity(order?.open_quantity) ??
      (() => {
        const total = toQuantity(order?.total_quantity)
        if (total === null) return null
        return (
          total -
          (toQuantity(order?.filled_quantity) ?? 0) -
          (toQuantity(order?.canceled_quantity) ?? 0)
        )
      })()
    if (openQty === null || !(openQty > 0)) {
      if (openQty === null) skipped.push(`${symbol}: pending buy has no readable quantity`)
      continue
    }

    // Best cost estimate for unfilled shares: the limit price, else whatever
    // partially executed at. Market orders carry neither — basis stays null.
    const costEstimate =
      toQuantity(order?.limit_price) ?? toQuantity(order?.execution_price)

    rows.push({
      symbol,
      asset_class:
        order?.universal_symbol?.type?.code === "crypto" ? "crypto" : "equity",
      quantity: openQty,
      avg_cost: costEstimate !== null && costEstimate >= 0 ? costEstimate : null,
      price: null,
      price_as_of: null,
    })
  }

  return { rows: mergeRows(rows), skipped }
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
  const syncedAt = new Date().toISOString()

  const [connectionsResponse, accountsResponse] = await Promise.all([
    withSnapTradeRetry(() => snaptrade.connections.listBrokerageAuthorizations(auth)),
    withSnapTradeRetry(() => snaptrade.accountInformation.listUserAccounts(auth)),
  ])
  const connections = connectionsResponse.data ?? []
  const stAccounts = accountsResponse.data ?? []

  const report: SyncReport = {
    connections: 0,
    accounts: 0,
    holdings: 0,
    pendingBuys: 0,
    skipped: [],
  }

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
        const [positionsResponse, ordersResult] = await Promise.all([
          withSnapTradeRetry(() =>
            snaptrade.accountInformation.getUserAccountPositions({
              ...auth,
              accountId: stAccount.id,
            }),
          ),
          // Open orders are best-effort: some brokers don't support the
          // orders endpoint, and a failure here shouldn't block the position
          // sync that carries the real holdings.
          withSnapTradeRetry(() =>
            snaptrade.accountInformation.getUserAccountOrders({
              ...auth,
              accountId: stAccount.id,
              state: "open",
            }),
          ).catch((error: unknown) => {
            report.skipped.push(
              `${stAccount.name ?? stAccount.id}: couldn't read pending orders — ${snapTradeErrorMessage(error)}`,
            )
            return null
          }),
        ])
        const positions = mapPositions(positionsResponse.data ?? [], syncedAt)
        const pending = mapOpenBuyOrders(ordersResult?.data ?? [])
        report.skipped.push(...positions.skipped, ...pending.skipped)
        report.pendingBuys += pending.rows.reduce((sum, row) => sum + row.quantity, 0)

        // Pending buys merge into the same symbol rows as settled positions,
        // so a purchase shows up in the portfolio the moment it's placed.
        const rows = mergeRows([...positions.rows, ...pending.rows])

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

/**
 * Cron entry point: sync every user who has at least one SnapTrade
 * connection. There is no session in a cron run, so users are discovered
 * from pt_snaptrade_connections via the service client. Per-user failures
 * are reported without aborting the remaining users.
 */
export async function syncAllSnapTradeUsers(): Promise<{
  users: number
  reports: SyncReport[]
  errors: string[]
}> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("pt_snaptrade_connections")
    .select("user_id")
  if (error) {
    throw new Error(`Couldn't list SnapTrade connections: ${error.message}`)
  }

  const userIds = [...new Set((data ?? []).map((row) => row.user_id as string))]
  const reports: SyncReport[] = []
  const errors: string[] = []

  for (const userId of userIds) {
    try {
      const stUser = await getOrRegisterStUser(userId)
      reports.push(await syncSnapTradeHoldings(userId, stUser))
    } catch (error) {
      errors.push(snapTradeErrorMessage(error))
    }
  }

  return { users: userIds.length, reports, errors }
}
