import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes only the allowlisted owner may see. Everything else is public:
// anonymous visitors get demo mode.
const OWNER_ONLY_PREFIXES = ["/admin", "/accounts"]

/**
 * Refreshes the Supabase auth session on every request and gates owner-only
 * routes. Must run in middleware so the session cookie stays fresh for Server
 * Components and the RLS-bound client (lib/db.ts).
 *
 * Note: a valid session is not enough for LIVE mode — the email must match
 * OWNER_EMAIL. The same Supabase project serves other studio apps, so on
 * localhost a session from another app can share the cookie. Non-owner
 * sessions are treated exactly like anonymous visitors (demo mode).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: getUser() (not getSession()) — it revalidates the token with
  // the Supabase auth server, which is what actually refreshes an expiring
  // session.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isOwnerOnly = OWNER_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase()
  const isOwner =
    !!user?.email && !!ownerEmail && user.email.toLowerCase() === ownerEmail

  if (isOwnerOnly && !isOwner) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectTo", pathname)
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
