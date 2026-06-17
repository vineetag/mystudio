import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

/** Directories never worth walking — build output, deps, vcs, caches. */
const BUILTIN_IGNORE = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  ".turbo",
  ".git",
  ".vercel",
  "coverage",
  ".cache",
])

/**
 * Recursively collect file paths under `dir`. `ignoreDirs` are matched by exact
 * directory name at any depth (cheap and predictable — no glob engine needed).
 */
export function walk(
  dir: string,
  opts: { exts?: string[]; ignoreDirs?: string[] } = {},
): string[] {
  const ignore = new Set([...BUILTIN_IGNORE, ...(opts.ignoreDirs ?? [])])
  const exts = opts.exts
  const out: string[] = []

  const visit = (current: string): void => {
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      return // unreadable dir — skip rather than crash the whole run
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (ignore.has(entry.name)) continue
        visit(join(current, entry.name))
      } else if (entry.isFile()) {
        if (!exts || exts.some((e) => entry.name.endsWith(e))) {
          out.push(join(current, entry.name))
        }
      }
    }
  }

  visit(dir)
  return out
}

export function readText(abs: string): string {
  return readFileSync(abs, "utf8")
}
