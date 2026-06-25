import type { User } from "@supabase/supabase-js"

/** Gmail ignores dots and +aliases; normalize so allowlist checks match. */
export function normalizeEmailForComparison(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf("@")
  if (at === -1) return trimmed

  let local = trimmed.slice(0, at)
  let domain = trimmed.slice(at + 1)
  if (domain === "googlemail.com") domain = "gmail.com"
  if (domain === "gmail.com") {
    local = local.split("+")[0].replace(/\./g, "")
  }
  return `${local}@${domain}`
}

export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? ""
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeEmailForComparison)
}

/** Collect confirmed emails Supabase attaches to a signed-in user. */
export function collectUserEmails(user: User): string[] {
  const emails = new Set<string>()
  if (user.email) emails.add(user.email)

  for (const identity of user.identities ?? []) {
    const identityEmail = identity.identity_data?.email
    if (typeof identityEmail === "string") emails.add(identityEmail)
  }

  return [...emails]
}

export function isAdminUser(user: User): boolean {
  const allow = getAdminAllowlist()
  if (allow.length === 0) return false

  return collectUserEmails(user).some((email) =>
    allow.includes(normalizeEmailForComparison(email)),
  )
}
