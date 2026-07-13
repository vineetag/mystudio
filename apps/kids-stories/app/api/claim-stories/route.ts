import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ANON_CLAIM_COOKIE } from "@/lib/anon-claim"
import { CLAIM_GRANT_COOKIE, verifyClaimGrant } from "@/lib/claim-grant"
import { createClient, createServiceClient } from "@/lib/db"

export const runtime = "nodejs"

/**
 * Transfers stories from an anonymous user to the signed-in permanent user —
 * but only when a signed claim grant proves the anonymous session belonged to
 * this browser.
 *
 * The grant is minted by /api/claim-stories/stage from the caller's own
 * anonymous session (never client input), HMAC-signed, short-lived, and
 * cleared on first use. That closes the original IDOR (arbitrary
 * client-supplied anon ids) and narrows the shared-device window to: same
 * browser, within the grant TTL, after an explicit save-and-sign-in attempt.
 *
 * When the OAuth upgrade preserved the user id (linkIdentity on a brand-new
 * identity), the grant's anon id equals the current user id and there is
 * nothing to move. The legacy ANON_CLAIM_COOKIE is only ever cleared.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const cookieStore = await cookies()
  const grant = cookieStore.get(CLAIM_GRANT_COOKIE)?.value ?? null
  const anonId = verifyClaimGrant(grant)

  // No valid grant, or the upgrade already preserved the user id — nothing to
  // transfer. Still clear claim cookies so stale state can't linger.
  if (!anonId || anonId === user.id) {
    return clearClaimCookies(NextResponse.json({ ok: true, claimed: 0 }))
  }

  const admin = createServiceClient()

  // The grant is only ever minted for an anonymous session, but re-check the
  // source user before moving anything owned by that id.
  const { data: anonUser, error: lookupError } =
    await admin.auth.admin.getUserById(anonId)
  if (lookupError || !anonUser.user?.is_anonymous) {
    return clearClaimCookies(NextResponse.json({ ok: true, claimed: 0 }))
  }

  const { data: moved, error: updateError } = await admin
    .from("stories")
    .update({ user_id: user.id })
    .eq("user_id", anonId)
    .select("id")

  if (updateError) {
    console.error("claim-stories: transfer failed:", updateError.message)
    return NextResponse.json(
      { error: "Could not move your stories. Please try again." },
      { status: 500 },
    )
  }

  // Delete the now-empty anon user so the grant cannot be replayed against it.
  // Best-effort: the weekly cleanup cron removes it if this fails.
  const { error: deleteError } = await admin.auth.admin.deleteUser(anonId)
  if (deleteError) {
    console.error("claim-stories: anon user cleanup failed:", deleteError.message)
  }

  return clearClaimCookies(
    NextResponse.json({ ok: true, claimed: moved?.length ?? 0 }),
  )
}

function clearClaimCookies(response: NextResponse) {
  for (const name of [CLAIM_GRANT_COOKIE, ANON_CLAIM_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
  }
  return response
}
