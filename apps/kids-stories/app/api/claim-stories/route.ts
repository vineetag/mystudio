import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ANON_CLAIM_COOKIE } from "@/lib/anon-claim"
import { createClient, createServiceClient } from "@/lib/db"

export const runtime = "nodejs"

/**
 * Transfers stories from an anonymous user to the currently authenticated user.
 * Called by StoryClaimer after a visitor who generated stories anonymously signs
 * into a permanent account. Uses the service client to bypass RLS on the move.
 *
 * The anonymous source id is read from an httpOnly cookie (set by middleware),
 * not from the request body — so a signed-in user cannot claim another visitor's
 * stories by guessing their UUID.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const anonId = (await cookies()).get(ANON_CLAIM_COOKIE)?.value ?? null

  if (!anonId || anonId === user.id) {
    return clearClaimCookie(NextResponse.json({ ok: true }))
  }

  const svc = createServiceClient()

  // Security: only claim stories from a source that is actually an anonymous
  // user. Without this, any signed-in user could pass another user's id and
  // seize their stories (IDOR).
  const { data: source } = await svc.auth.admin.getUserById(anonId)
  if (!source.user?.is_anonymous) {
    return clearClaimCookie(NextResponse.json({ ok: true }))
  }

  await svc.from("stories").update({ user_id: user.id }).eq("user_id", anonId)

  return clearClaimCookie(NextResponse.json({ ok: true }))
}

function clearClaimCookie(response: NextResponse) {
  response.cookies.set(ANON_CLAIM_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}
