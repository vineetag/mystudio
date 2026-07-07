import "server-only"

import { cache } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/db"

export type ViewerMode = "live" | "demo"

export interface Viewer {
  user: User | null
  isOwner: boolean
  /** "live" only for the allowlisted owner; everyone else browses demo data. */
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
 * Resolve the current viewer once per request (React cache). Server-side only.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwner = isOwnerEmail(user?.email)
  return { user, isOwner, mode: isOwner ? "live" : "demo" }
})
