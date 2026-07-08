"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import type { ActionResult, ActionResultWith } from "@/lib/action-result"
import { createServiceClient } from "@/lib/db"
import { requireOwner } from "@/modules/auth"
import {
  getSnapTradeClient,
  isSnapTradeConfigured,
  snapTradeErrorMessage,
  withSnapTradeRetry,
} from "./client"
import { getOrRegisterStUser } from "./users"
import { syncSnapTradeHoldings } from "./sync"
import type { SyncReport } from "./types"

function notConfiguredError(): { ok: false; error: string } {
  return {
    ok: false,
    error:
      "SnapTrade isn't configured on this deployment — set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY.",
  }
}

/**
 * Create (or reuse) the SnapTrade user and return a Connection Portal URL.
 * The URL expires in ~5 minutes; the client redirects to it immediately.
 * Connections are requested read-only — this app never trades (spec non-goal).
 */
export async function getConnectPortalUrl(): Promise<ActionResultWith<string>> {
  const owner = await requireOwner()
  if (!owner.ok) return owner
  if (!isSnapTradeConfigured()) return notConfiguredError()

  try {
    const stUser = await getOrRegisterStUser(owner.userId)
    const snaptrade = getSnapTradeClient()
    // Same fallback chain as auth: explicit site URL, else the request's own
    // origin — so the SnapTrade portal returns to the preview URL it left from.
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (await headers()).get("origin") ??
      "http://localhost:3003"

    const response = await withSnapTradeRetry(() =>
      snaptrade.authentication.loginSnapTradeUser({
        userId: stUser.stUserId,
        userSecret: stUser.stUserSecret,
        immediateRedirect: true,
        customRedirect: `${siteUrl}/accounts?snaptrade=connected`,
        connectionType: "read",
      }),
    )

    const redirectURI =
      "redirectURI" in response.data ? response.data.redirectURI : undefined
    if (!redirectURI) {
      return { ok: false, error: "SnapTrade didn't return a connection portal URL." }
    }
    return { ok: true, data: redirectURI }
  } catch (error) {
    return { ok: false, error: snapTradeErrorMessage(error) }
  }
}

/** Pull positions from every connection into accounts/holdings. */
export async function syncSnapTradeNow(): Promise<ActionResultWith<SyncReport>> {
  const owner = await requireOwner()
  if (!owner.ok) return owner
  if (!isSnapTradeConfigured()) return notConfiguredError()

  try {
    const stUser = await getOrRegisterStUser(owner.userId)
    const report = await syncSnapTradeHoldings(owner.userId, stUser)
    revalidatePath("/accounts")
    revalidatePath("/")
    return { ok: true, data: report }
  } catch (error) {
    return { ok: false, error: snapTradeErrorMessage(error) }
  }
}

/**
 * Remove a brokerage connection at SnapTrade and locally. Synced accounts
 * and their holdings stay — they simply stop updating (delete them from the
 * accounts page if unwanted).
 */
export async function disconnectSnapTradeConnection(
  connectionId: string,
): Promise<ActionResult> {
  const owner = await requireOwner()
  if (!owner.ok) return owner
  if (!isSnapTradeConfigured()) return notConfiguredError()

  try {
    const stUser = await getOrRegisterStUser(owner.userId)
    const snaptrade = getSnapTradeClient()
    await withSnapTradeRetry(() =>
      snaptrade.connections.removeBrokerageAuthorization({
        authorizationId: connectionId,
        userId: stUser.stUserId,
        userSecret: stUser.stUserSecret,
      }),
    )

    const { error } = await createServiceClient()
      .from("pt_snaptrade_connections")
      .delete()
      .eq("id", connectionId)
      .eq("user_id", owner.userId)
    if (error) {
      return {
        ok: false,
        error: `Disconnected at SnapTrade, but couldn't remove the local record: ${error.message}`,
      }
    }

    revalidatePath("/accounts")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: snapTradeErrorMessage(error) }
  }
}
