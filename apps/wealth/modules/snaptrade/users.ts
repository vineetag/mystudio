import "server-only"

import { createServiceClient } from "@/lib/db"
import { getSnapTradeClient, withSnapTradeRetry } from "./client"

export interface StUser {
  stUserId: string
  stUserSecret: string
}

/**
 * Resolve (or lazily create) the SnapTrade user for our Supabase user.
 *
 * Personal SnapTrade keys (PERS-*) come with exactly one user, provisioned at
 * signup — registerUser is rejected with code 1012. For those, set
 * SNAPTRADE_USER_ID and SNAPTRADE_USER_SECRET (from the SnapTrade dashboard)
 * and they are used directly; fine here since LIVE mode has a single owner.
 *
 * Otherwise (partner keys) the userSecret is issued exactly once at
 * registration, so it is persisted in pt_snaptrade_users — a table with RLS
 * enabled and NO policies, readable only through the service role. It never
 * reaches the client. (It is a SnapTrade API secret, not a brokerage
 * credential — those never leave SnapTrade; see the PRODUCT_SPEC guardrails.)
 */
export async function getOrRegisterStUser(userId: string): Promise<StUser> {
  const envUserId = process.env.SNAPTRADE_USER_ID
  const envUserSecret = process.env.SNAPTRADE_USER_SECRET
  if (envUserId && envUserSecret) {
    return { stUserId: envUserId, stUserSecret: envUserSecret }
  }

  const service = createServiceClient()

  const { data: existing, error: readError } = await service
    .from("pt_snaptrade_users")
    .select("st_user_id, st_user_secret")
    .eq("user_id", userId)
    .maybeSingle()

  if (readError) {
    throw new Error(`Couldn't read the SnapTrade user record: ${readError.message}`)
  }
  if (existing) {
    return { stUserId: existing.st_user_id, stUserSecret: existing.st_user_secret }
  }

  const snaptrade = getSnapTradeClient()
  const response = await withSnapTradeRetry(() =>
    snaptrade.authentication.registerSnapTradeUser({ userId }),
  )
  const { userId: stUserId, userSecret: stUserSecret } = response.data
  if (!stUserId || !stUserSecret) {
    throw new Error("SnapTrade registration returned no user id/secret.")
  }

  const { error: writeError } = await service.from("pt_snaptrade_users").insert({
    user_id: userId,
    st_user_id: stUserId,
    st_user_secret: stUserSecret,
  })
  if (writeError) {
    throw new Error(`Couldn't store the SnapTrade user record: ${writeError.message}`)
  }

  return { stUserId, stUserSecret }
}
