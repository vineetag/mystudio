import { NextResponse } from "next/server"
import { createClient } from "@/lib/db"

/**
 * Handles the redirect from Supabase email links (confirmation, magic link,
 * password recovery). Exchanges the PKCE `code` for a session — which sets the
 * auth cookies via lib/db's cookie adapter — then forwards the user on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/library"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code, or the exchange failed — send them back to log in.
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback`)
}
