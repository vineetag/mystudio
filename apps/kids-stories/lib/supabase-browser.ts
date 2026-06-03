import { createBrowserClient } from "@supabase/ssr"

/**
 * Supabase client for Client Components. Persists the auth session in cookies
 * (via @supabase/ssr) so the server, SSR, and middleware all see the same login
 * state. Safe to call on every render — the SDK memoizes the singleton.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
