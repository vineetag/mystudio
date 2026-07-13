import { NextResponse } from "next/server"
import {
  CLAIM_GRANT_COOKIE,
  CLAIM_GRANT_TTL_SECONDS,
  createClaimGrant,
} from "@/lib/claim-grant"
import { createClient } from "@/lib/db"

export const runtime = "nodejs"

/**
 * Stages an anonymous-story claim before an OAuth sign-in attempt.
 *
 * Called by the auth form while the visitor still holds their anonymous
 * session, right before redirecting to Google. The anon id is read from the
 * caller's own session — never from the request body — and stored in a signed
 * httpOnly cookie. If the OAuth flow ends in a different permanent account
 * (identity already existed, so linkIdentity could not preserve the user id),
 * POST /api/claim-stories verifies this grant and moves the stories.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.is_anonymous) {
    return NextResponse.json(
      { error: "Only anonymous sessions can stage a story claim." },
      { status: 401 },
    )
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(CLAIM_GRANT_COOKIE, createClaimGrant(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CLAIM_GRANT_TTL_SECONDS,
  })
  return response
}
