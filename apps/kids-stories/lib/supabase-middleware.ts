import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that require an authenticated user. Unauthed visitors are bounced to
// /auth/login (with ?redirectTo so we can send them back after they sign in).
const PROTECTED_PREFIXES = ["/library"]

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection. Must run in middleware so the session cookie is kept fresh for
 * Server Components and the route-level RLS client (lib/db.ts).
 *
 * Cookie handling follows the @supabase/ssr contract exactly: never construct a
 * standalone response without copying the refreshed auth cookies onto it, or
 * the session silently desyncs.
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

  // IMPORTANT: getUser() (not getSession()) — it revalidates the token with the
  // Supabase auth server, which is what actually refreshes an expiring session.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("redirectTo", pathname)
    const redirectResponse = NextResponse.redirect(url)
    // Carry the refreshed auth cookies onto the redirect response.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
