import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes requiring a permanent (non-anonymous) account.
const PROTECTED_PREFIXES = ["/library", "/admin"]

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection. Must run in middleware so the session cookie is kept fresh for
 * Server Components and the route-level RLS client (lib/db.ts).
 *
 * For first-time visitors on page routes (not /auth/* or /api/*), we call
 * signInAnonymously() here so the session cookie lands on the browser BEFORE
 * the page is rendered. Client components can then call getUser() and always
 * find a valid session — no race between cookie-set and the first API call.
 *
 * Anonymous users (is_anonymous=true) are blocked from /library and redirected
 * to /auth/signup. On signup their UUID is preserved, so existing stories
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Auto-create anonymous session for first-time visitors on page routes.
  // Excluded: /auth/* (they manage their own session flow) and /api/* (cookie
  // would land on the response too late to help the same request).
  const isPageRoute =
    !pathname.startsWith("/auth/") && !pathname.startsWith("/api/")

  if (!user && isPageRoute) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      // Log but don't block the request — the page will degrade gracefully.
      console.error("[middleware] signInAnonymously failed:", error.message)
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  // Block anonymous and unauthenticated visitors from protected routes.
  // Redirect to signup so they can upgrade — UUID is preserved on upgrade
  // and all existing stories transfer automatically.
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
