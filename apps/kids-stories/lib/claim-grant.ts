import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Signed, short-lived "claim grant" for transferring anonymous-user stories to
 * a permanent account after an OAuth sign-in that could not preserve the user
 * id (the visitor's Google identity already belonged to an existing account).
 *
 * Security model (closes the old claim-stories IDOR without losing stories):
 * - The grant is minted ONLY by the stage endpoint, from the anon id of the
 *   caller's own authenticated session — never from client-supplied input.
 * - It is HMAC-signed server-side, so a forged or tampered cookie fails
 *   verification even though the browser can technically overwrite the cookie.
 * - It expires after CLAIM_GRANT_TTL_SECONDS and is cleared on first use, so a
 *   later visitor on a shared device cannot replay it.
 */
export const CLAIM_GRANT_COOKIE = "zippy_claim_grant"

export const CLAIM_GRANT_TTL_SECONDS = 30 * 60

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// The service-role key is the one secret guaranteed to exist server-side in
// every environment; it is used here only as HMAC key material and never
// leaves the server, so signing with it does not widen its exposure.
function signingKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return key
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url")
}

export function createClaimGrant(anonId: string, now = Date.now()): string {
  if (!UUID_RE.test(anonId)) throw new Error("Invalid anon user id")
  const expiresAt = Math.floor(now / 1000) + CLAIM_GRANT_TTL_SECONDS
  const payload = `${anonId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

/** Returns the anon user id if the grant is authentic and unexpired, else null. */
export function verifyClaimGrant(
  value: string | null | undefined,
  now = Date.now(),
): string | null {
  if (!value) return null

  const parts = value.split(".")
  if (parts.length !== 3) return null
  const [anonId, expiresAtRaw, signature] = parts

  if (!UUID_RE.test(anonId)) return null

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 < now) return null

  const expected = Buffer.from(sign(`${anonId}.${expiresAtRaw}`))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length) return null
  if (!timingSafeEqual(expected, actual)) return null

  return anonId
}
