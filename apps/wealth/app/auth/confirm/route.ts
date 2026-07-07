import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/db"

/**
 * Magic-link landing route. Supabase sends the owner here with either a
 * `token_hash` (OTP flow) or a `code` (PKCE flow) depending on auth config —
 * handle both so a project-level template change can't break sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL("/", request.url))
    return redirectWithError(request, error.message)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL("/", request.url))
    return redirectWithError(request, error.message)
  }

  return redirectWithError(
    request,
    "The sign-in link was missing its token — it may have been truncated by your email client. Request a new link.",
  )
}

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/login", request.url)
  url.searchParams.set("error", message)
  return NextResponse.redirect(url)
}
