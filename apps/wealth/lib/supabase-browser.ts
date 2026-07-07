import { createBrowserClient } from "@supabase/ssr"

/**
 * Browser Supabase client — auth flows only (magic-link request, sign-out).
 * All data access stays server-side per studio rules.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
