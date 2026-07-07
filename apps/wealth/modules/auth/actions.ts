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
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const origin = (await headers()).get("origin")
  return origin ?? "http://localhost:3003"
}

/**
 * Send a magic sign-in link — but only to the allowlisted owner email.
 * Anyone else gets a clear refusal and no email is sent, so the auth surface
 * stays closed to the public. Demo mode needs no account at all.
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

  if (!isOwnerEmail(trimmed)) {
    return {
      ok: false,
      error:
        "OneFolio is a single-owner app and this email isn't on the allowlist, so no sign-in link was sent. You can explore everything in demo mode without an account.",
    }
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

  return {
    ok: true,
    message: `Sign-in link sent to ${trimmed}. Open it on this device to finish signing in.`,
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
