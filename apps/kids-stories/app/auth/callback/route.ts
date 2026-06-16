import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/db"

/**
 * Handles the redirect from Supabase email links (confirmation, magic link,
 * password recovery). Exchanges the PKCE `code` for a session — which sets the
 * auth cookies via lib/db's cookie adapter — then forwards the user on.
 *
 * Also handles story transfer: when an anonymous user signs up but ends up
 * logged in as an existing account (different UUID), we move their stories
 * to the newly authenticated user before redirecting.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/library"

  if (code) {
    const cookieStore = await cookies()
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const anonId = cookieStore.get("zippy_anon_uid")?.value
      const newUserId = data.user?.id
      if (anonId && newUserId && anonId !== newUserId) {
        const svc = createServiceClient()
        await svc.from("stories").update({ user_id: newUserId }).eq("user_id", anonId)
      }
      const response = NextResponse.redirect(`${origin}${next}`)
      if (anonId) response.cookies.delete("zippy_anon_uid")
      return response
    }
  }

  // No code, or the exchange failed — send them back to log in.
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback`)
}
