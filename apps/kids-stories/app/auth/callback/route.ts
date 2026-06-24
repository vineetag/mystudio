import { NextResponse } from "next/server"
import { createClient } from "@/lib/db"
import { safeAuthRedirectPath } from "@/lib/redirects"

/**
 * Handles the redirect from Supabase email links (confirmation, magic link,
 * password recovery). Exchanges the PKCE `code` for a session — which sets the
 * auth cookies via lib/db's cookie adapter — then forwards the user on.
 *
 * Note: Google OAuth does NOT pass through here in production — Supabase returns
 * it to the Site URL and the session is established client-side. Anonymous-story
 * transfer is therefore handled by StoryClaimer (components/story-claimer), not
 * this route.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = safeAuthRedirectPath(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // No code, or the exchange failed — send them back to log in.
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback`)
}
