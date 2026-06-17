import { existsSync } from "node:fs"
import { join, relative, sep } from "node:path"
import type { Finding, Rule, RuleContext } from "../types.ts"
import { walk } from "../walk.ts"

/** A versioned migration name: a numeric/timestamp prefix, e.g. 0001_, 20240617120000_. */
const VERSIONED = /^[0-9]{3,}[._-]/

export const sqlMigrations: Rule = {
  name: "sql-migrations",
  description:
    "Database changes go through versioned SQL migration files in the migrations dir. Flags stray .sql files elsewhere and unversioned migration filenames.",
  check(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const { appsDir, migrationsDir } = ctx.config

    for (const app of ctx.apps) {
      const appAbs = join(ctx.rootDir, appsDir, app)
      const migAbs = join(appAbs, migrationsDir)

      // Every .sql file under the app...
      for (const sqlAbs of walk(appAbs, { exts: [".sql"], ignoreDirs: ctx.config.ignoreDirs })) {
        const rel = relative(ctx.rootDir, sqlAbs).split(sep).join("/")
        const inMigrations = existsSync(migAbs) && sqlAbs.startsWith(migAbs + sep)

        if (!inMigrations) {
          findings.push({
            rule: this.name,
            severity: "warning",
            file: rel,
            message: `SQL file outside the migrations dir (${migrationsDir}).`,
            fix: "Schema changes must be versioned migrations, not ad-hoc SQL. Move it into the migrations dir.",
          })
          continue
        }

        const base = sqlAbs.split(sep).pop()!
        if (!VERSIONED.test(base)) {
          findings.push({
            rule: this.name,
            severity: "warning",
            file: rel,
            message: `Migration "${base}" has no version prefix.`,
            fix: "Prefix with an ordered version, e.g. 0001_ or a timestamp, so migrations apply deterministically.",
          })
        }
      }
    }

    return findings
  },
}
