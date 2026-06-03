// Apply versioned SQL migrations to the Supabase Postgres database.
//
// Usage (loads .env.local via Node's --env-file):
//   node --env-file=.env.local scripts/run-migrations.mjs                 # all files in supabase/migrations
//   node --env-file=.env.local scripts/run-migrations.mjs 0003 0004       # only matching files
//
// Requires SUPABASE_DB_URL in the environment — the Postgres connection URI
// from Supabase → Project Settings → Database (includes the password). Each
// file runs inside its own transaction; DDL rolls back on error.

import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations")

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error(
    "Missing SUPABASE_DB_URL. Add it to .env.local (Supabase → Project Settings → Database → Connection string).",
  )
  process.exit(1)
}

const filters = process.argv.slice(2)
const allFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
const files = filters.length
  ? allFiles.filter((f) => filters.some((needle) => f.includes(needle)))
  : allFiles

if (files.length === 0) {
  console.error("No matching migration files found.")
  process.exit(1)
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
})

try {
  await client.connect()
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8")
    process.stdout.write(`Applying ${file} ... `)
    try {
      await client.query("begin")
      await client.query(sql)
      await client.query("commit")
      console.log("ok")
    } catch (err) {
      await client.query("rollback")
      console.log("FAILED")
      throw err
    }
  }
  console.log(`\nApplied ${files.length} migration(s).`)
} catch (err) {
  console.error("\nMigration error:", err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
