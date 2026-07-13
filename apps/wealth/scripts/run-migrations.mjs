// Apply versioned SQL migrations to the mystudio Supabase Postgres database.
//
// Usage (loads .env.local via Node's --env-file):
//   node --env-file=.env.local scripts/run-migrations.mjs
//   node --env-file=.env.local scripts/run-migrations.mjs 0005
//
// Requires DATABASE_URL or SUPABASE_DB_URL in the environment — the Postgres
// connection URI from Supabase → Project Settings → Database → Connection string.

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
      "  Supabase Dashboard → mystudio → Settings → Database → Connection string (URI)",
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
  process.exitCode = 1
} finally {
  await client.end()
}
