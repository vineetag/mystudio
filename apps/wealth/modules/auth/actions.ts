"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/db"
import { isOwnerEmail } from "./session"

export type RequestMagicLinkResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function siteOrigin(): Promise<string> {
  // Prefer the live request host so magic-link redirects match where the user
  // actually signed in (e.g. getonefolio.app), not a shared monorepo env var
  // that may point at appcrafter.studio.
  const origin = (await headers()).get("origin")
  if (origin) return origin

  const host =
    (await headers()).get("x-forwarded-host") ?? (await headers()).get("host")
  if (host) {
    const proto = (await headers()).get("x-forwarded-proto") ?? "https"
    return `${proto}://${host.split(",")[0]?.trim()}`
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  return "http://localhost:3003"
}

/**
 * Send a magic sign-in link — but only to the allowlisted owner email.
 * Non-owners get the same neutral response and no email, so the form can't be
 * used to confirm the owner's address. Demo mode needs no account at all.
 */
export async function requestMagicLink(
  email: string,
): Promise<RequestMagicLinkResult> {
  const trimmed = email.trim()

  if (!EMAIL_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: `"${trimmed}" doesn't look like an email address. Check for typos and try again.`,
    }
  }

  // Neutral, identical response whether or not this email is the owner, so the
  // form can't be used to confirm the owner's address (user enumeration). A
  // link is only actually sent to the allowlisted owner; everyone else gets the
  // same message and no email. Demo mode needs no account at all.
  const neutralOk: RequestMagicLinkResult = {
    ok: true,
    message:
      "If that email is authorized to sign in, a link is on its way — open it on this device to finish. Meanwhile you can explore everything in demo mode without an account.",
  }

  if (!isOwnerEmail(trimmed)) {
    return neutralOk
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
    },
  })

  if (error) {
    return {
      ok: false,
      error: `Couldn't send the sign-in link: ${error.message}. Wait a moment and try again.`,
    }
  }

  return neutralOk
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
