import "server-only"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Cookie-bound Supabase client for Server Components, Server Actions, and Route
 * Handlers. Reads/writes the auth session via Next's cookie store so middleware
 * and SSR stay in sync. Respects RLS as the signed-in user.
 *
 * In Next 15 `cookies()` is async, so this helper is async too.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore — the middleware (Step 4) refreshes the session.
          }
        },
      },
    },
  )
}

/**
 * Service-role client. Bypasses RLS — server-only, never expose to the client.
 * Use sparingly for trusted operations (e.g. admin tooling, system inserts).
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
