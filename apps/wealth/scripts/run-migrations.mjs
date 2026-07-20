// Apply versioned SQL migrations to the mystudio Supabase Postgres database.
//
// Usage (loads .env.local via Node's --env-file):
//   node --env-file=.env.local scripts/run-migrations.mjs
//   node --env-file=.env.local scripts/run-migrations.mjs 0005
//
// Requires DATABASE_URL or SUPABASE_DB_URL in the environment. Use the
// SESSION-MODE POOLER URI (port 5432), not the direct connection:
//
//   postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres
//
// Two things that will otherwise cost you an afternoon:
//   - The direct host (db.<project-ref>.supabase.co) no longer resolves over
//     IPv4. A stale URI fails with ENOTFOUND, which reads like a network
//     problem rather than a connection-string problem.
//   - Take the SESSION pooler string, not the transaction one (port 6543).
//     Transaction mode does not hold a session across a multi-statement
//     script, which is exactly what a migration is.
//
// The pooler username is `postgres.<project-ref>`, not bare `postgres`, and
// the regional prefix (aws-0 / aws-1 / ...) varies per project — both resolve
// in DNS, so the wrong one fails at auth with "tenant or user not found".
// Copy the exact string from the dashboard rather than assembling it by hand:
// Supabase → Project Settings → Database → Connection string → Session pooler.

import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations")

const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error(
    "Missing DATABASE_URL (or SUPABASE_DB_URL). Add it to apps/wealth/.env.local:\n" +
      "  Supabase Dashboard → mystudio → Settings → Database → Connection string\n" +
      "  → Session pooler (port 5432). Not the direct connection, which no longer\n" +
      "  resolves over IPv4, and not the transaction pooler on 6543.",
  )
  process.exit(1)
}

const filters = process.argv.slice(2)
const allFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort()
const files = filters.length
  ? allFiles.filter((file) => filters.some((needle) => file.includes(needle)))
  : allFiles

if (files.length === 0) {
  console.error("No matching migration files found.")
  process.exit(1)
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()

  await client.query(`
    create table if not exists public._schema_migrations (
      filename text primary key,
      applied_at timestamptz default now()
    );
  `)

  let applied = 0
  let skipped = 0

  for (const file of files) {
    const { rows } = await client.query(
      "select count(*)::int as count from public._schema_migrations where filename = $1",
      [file],
    )
    if (rows[0]?.count === 1) {
      console.log(`skip  ${file} (already applied)`)
      skipped++
      continue
    }

    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8")
    process.stdout.write(`apply ${file} ... `)
    try {
      await client.query("begin")
      await client.query(sql)
      await client.query(
        "insert into public._schema_migrations (filename) values ($1)",
        [file],
      )
      await client.query("commit")
      console.log("ok")
      applied++
    } catch (error) {
      await client.query("rollback")
      console.log("FAILED")
      throw error
    }
  }

  console.log(`\nDone — ${applied} applied, ${skipped} skipped.`)
} catch (error) {
  console.error("\nMigration error:", error instanceof Error ? error.message : error)
  const hint = connectionHint(error)
  if (hint) console.error(`\n${hint}`)
  process.exitCode = 1
} finally {
  await client.end()
}

/**
 * Turn the two opaque connection failures into the fix.
 *
 * Both surface as errors that point away from the real cause: a retired direct
 * host looks like a network outage, and a pooler username mismatch looks like
 * bad credentials. Neither mentions the connection string that actually needs
 * changing.
 */
function connectionHint(error) {
  const message = error instanceof Error ? error.message : String(error)

  // Checked before ENOTFOUND on purpose: the pooler reports an unknown tenant
  // as "(ENOTFOUND) tenant/user <name> not found", so the generic host branch
  // would otherwise swallow it and send you hunting a DNS problem that isn't
  // there. Both wordings appear in the wild.
  if (/tenant(?:\/| or )user\b.*not found/i.test(message)) {
    return "The pooler rejected the username. Two usual causes:\n" +
      "  - it must be `postgres.<project-ref>`, not bare `postgres`\n" +
      "  - the regional prefix may be wrong (aws-0 vs aws-1) — both resolve in DNS,\n" +
      "    so the wrong one fails here at auth rather than at lookup"
  }

  // A bare `postgres` username gives the pooler nothing to route on, and it
  // says so in terms ("no tenant identifier provided") that never mention the
  // username.
  if (/ENOIDENTIFIER|no tenant identifier/i.test(message)) {
    return "The pooler could not tell which project this is: the username must carry the\n" +
      "project ref — `postgres.<project-ref>`, not bare `postgres`."
  }

  if (error?.code === "ENOTFOUND" || message.includes("ENOTFOUND")) {
    const direct = /db\.[a-z0-9]+\.supabase\.co/.test(message)
    return direct
      ? "That is the DIRECT connection host, which no longer resolves over IPv4.\n" +
          "Switch DATABASE_URL to the session pooler:\n" +
          "  postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres\n" +
          "Copy it from Supabase → Project Settings → Database → Connection string → Session pooler."
      : "The database host did not resolve. Check DATABASE_URL for a typo, and note that\n" +
          "the pooler's regional prefix (aws-0 / aws-1 / ...) differs per project."
  }

  return null
}
