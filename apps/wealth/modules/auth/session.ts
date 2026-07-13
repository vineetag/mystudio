import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/db"

export type ViewerMode = "live" | "demo"

/**
 * Owner-only preview override: when set to "demo", the signed-in owner
 * browses the demo portfolio instead of their live data. Ignored for
 * everyone else (non-owners are always in demo mode).
 */
export const VIEW_MODE_COOKIE = "pt-view-mode"

export interface Viewer {
  user: User | null
  isOwner: boolean
  /**
   * "live" only for the allowlisted owner — and only when they haven't
   * switched to the demo preview. Everyone else browses demo data.
   */
  mode: ViewerMode
}

/**
 * True only when the email matches the OWNER_EMAIL allowlist. A valid session
 * alone never grants LIVE mode — this Supabase project is shared with other
 * studio apps, so foreign sessions can exist (especially on localhost, where
 * apps on different ports share cookies).
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = process.env.OWNER_EMAIL
  return !!owner && !!email && email.toLowerCase() === owner.toLowerCase()
}

/**
 * Guard for mutating server actions: resolves to the owner's user id, or a
 * clear refusal for anyone else (anonymous or foreign session).
 */
export async function requireOwner(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const viewer = await getViewer()
  if (!viewer.isOwner || !viewer.user) {
    return {
      ok: false,
      error:
        "Only the signed-in owner can make changes. You're viewing demo mode.",
    }
  }
  return { ok: true, userId: viewer.user.id }
}

/**
 * Resolve the current viewer once per request (React cache). Server-side only.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const [supabase, cookieStore] = await Promise.all([createClient(), cookies()])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwner = isOwnerEmail(user?.email)
  const demoPreview = cookieStore.get(VIEW_MODE_COOKIE)?.value === "demo"
  return {
    user,
    isOwner,
    mode: isOwner && !demoPreview ? "live" : "demo",
  }
})
