import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes requiring a permanent (non-anonymous) account.
// Anonymous visitors have a session but no persistent identity.
const PROTECTED_PREFIXES = ["/library", "/admin"]

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection. Must run in middleware so the session cookie is kept fresh for
 * Server Components and the route-level RLS client (lib/db.ts).
 *
 * With anonymous sign-in enabled, every visitor eventually gets a session.
 * "Protected" therefore means: requires a permanent account (is_anonymous=false).
 * Anonymous users trying to reach /library are sent to /auth/signup so they
 * can upgrade their account — their stories transfer automatically because the
 * UUID is preserved on upgrade.
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

  // Block anonymous and unauthenticated visitors from protected routes.
  // Redirect to signup (not login) so they can create an account — their
  // existing stories transfer because the UUID is preserved on upgrade.
  if ((!user || user.is_anonymous) && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/signup"
    url.searchParams.set("redirectTo", pathname)
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
