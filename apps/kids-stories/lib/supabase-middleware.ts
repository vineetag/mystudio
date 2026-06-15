import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes requiring a permanent (non-anonymous) account.
const PROTECTED_PREFIXES = ["/library", "/admin"]

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection. Must run in middleware so the session cookie is kept fresh for
 * Server Components and the route-level RLS client (lib/db.ts).
 *
 * Anonymous sign-in is handled lazily client-side (in the submit handler)
 * rather than here — calling signInAnonymously() in Edge Middleware adds a
 * Supabase network round-trip on every page load which can exceed the Edge
 * CPU/latency budget and cause consistent failures.
 *
 * Anonymous users (is_anonymous=true) are blocked from /library and redirected
 * to /auth/signup. On upgrade their UUID is preserved, so existing stories
 * transfer automatically.
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
  // Redirect to signup (not login) so they can upgrade — UUID is preserved
  // on upgrade and all existing stories transfer automatically.
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
