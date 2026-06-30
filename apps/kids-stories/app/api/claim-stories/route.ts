import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ANON_CLAIM_COOKIE } from "@/lib/anon-claim"
import { createClient } from "@/lib/db"

export const runtime = "nodejs"

/**
 * Clears legacy anonymous-claim cookies.
 *
 * Older releases used this endpoint to move stories from an anonymous auth user
 * to a different permanent auth user. That browser-level handoff can transfer
 * one visitor's stories to the next person on a shared device, so cross-user
 * ownership moves are intentionally no-ops now. Safe upgrade flows preserve the
 * same Supabase user id instead.
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

  return clearClaimCookie(NextResponse.json({ ok: true, hadClaim: Boolean(anonId) }))
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
