"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase-browser"

/**
 * Handles OAuth errors that Supabase redirects back to the site root URL.
 *
 * identity_already_exists: fired when an anonymous user tries linkIdentity()
 * with a Google account that already belongs to a permanent Supabase user.
 * We clean up the URL and retry with signInWithOAuth so the user gets signed
 * in to their existing account seamlessly.
 */
export function OAuthErrorHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const errorCode = searchParams.get("error_code")
    if (!errorCode) return

    // Clean up the ugly error params from the URL immediately
    router.replace("/", { scroll: false })

    if (errorCode === "identity_already_exists") {
      toast.info("You already have an account — signing you in…")
      const supabase = createClient()
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/library`,
        },
      })
    }
  }, [searchParams, router])

  return null
}
