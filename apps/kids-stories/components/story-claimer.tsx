"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ANON_CLAIM_KEY } from "@/lib/anon-claim"
import { createClient } from "@/lib/supabase-browser"

/**
 * Transfers stories created during an anonymous session to a user's permanent
 * account once they authenticate.
 *
 * Why client-side (and not in /auth/callback): in production, Google OAuth
 * returns to the Supabase Site URL (the app root `/`), where @supabase/ssr
 * establishes the session in the browser. The server-side /auth/callback route
 * is never hit for OAuth, so any transfer logic there never runs. This runs in
 * the root layout, so it fires on whatever page OAuth lands on, the moment a
 * permanent session exists — independent of the redirect path Supabase chooses.
 *
 * The anonymous user id is stashed in localStorage before the auth redirect
 * (see auth-form). When a non-anonymous session appears whose id differs from
 * that stashed id, we move the stories server-side via /api/claim-stories, then
 * refresh so the freshly transferred stories render.
 */
export function StoryClaimer() {
  const router = useRouter()

  useEffect(() => {
    let anonId: string | null = null
    try {
      anonId = localStorage.getItem(ANON_CLAIM_KEY)
    } catch {
      // localStorage unavailable (private mode / blocked) — nothing to do.
    }
    if (!anonId) return

    const supabase = createClient()
    let handled = false

    async function claim(userId: string) {
      if (handled) return
      handled = true

      // linkIdentity / updateUser upgrades preserve the UUID — stories already
      // belong to this user. Just clear the marker.
      if (userId === anonId) {
        safeClear()
        return
      }

      try {
        const res = await fetch("/api/claim-stories", { method: "POST" })
        if (res.ok) {
          safeClear()
          // Re-render server components (e.g. /library) with the moved stories.
          router.refresh()
        } else {
          // Allow a later page load to retry.
          handled = false
        }
      } catch {
        handled = false
      }
    }

    // Session may already be established when this mounts (full page navigation
    // after email/password login, or a later visit).
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (user && !user.is_anonymous) void claim(user.id)
    })

    // Or it settles shortly after mount, when @supabase/ssr parses the OAuth
    // response out of the URL on the landing page.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (user && !user.is_anonymous) void claim(user.id)
    })

    return () => sub.subscription.unsubscribe()
  }, [router])

  return null
}

function safeClear() {
  try {
    localStorage.removeItem(ANON_CLAIM_KEY)
  } catch {
    // ignore
  }
}
