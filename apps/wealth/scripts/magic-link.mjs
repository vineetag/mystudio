// Dev-only: mint a magic link for OWNER_EMAIL without sending an email,
// sidestepping the built-in SMTP rate limit (2/hour on the free plan).
// Uses the service role key, so it must never run anywhere but a trusted
// local machine.
//
// Usage:
//   node scripts/magic-link.mjs                       # link back to NEXT_PUBLIC_SITE_URL
//   node scripts/magic-link.mjs https://getonefolio.app   # link back to production
//
// The printed URL signs you in as the owner when opened in a browser.
// Treat it like a password: don't paste it anywhere public. It expires
// like any other magic link and is single-use.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const appDir = dirname(dirname(fileURLToPath(import.meta.url)))
const envText = readFileSync(join(appDir, ".env.local"), "utf8")
const env = {}
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

let siteUrl = process.argv[2] ?? env.NEXT_PUBLIC_SITE_URL
// Allowlist globs like "http://localhost:3003/**" match paths, not the bare
// origin — a pathless redirectTo silently falls back to the Site URL.
if (siteUrl && new URL(siteUrl).pathname === "/" && !siteUrl.endsWith("/")) {
  siteUrl += "/"
}
if (!siteUrl) {
  console.error("No site URL: pass one as an argument or set NEXT_PUBLIC_SITE_URL.")
  process.exit(1)
}
if (!env.OWNER_EMAIL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("Missing OWNER_EMAIL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL in .env.local.")
  process.exit(1)
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email: env.OWNER_EMAIL,
  options: { redirectTo: siteUrl },
})

if (error) {
  console.error(`Couldn't generate the link: ${error.message}`)
  process.exit(1)
}

console.log(`Magic link for ${env.OWNER_EMAIL} (redirects to ${siteUrl}):\n`)
console.log(data.properties.action_link)
