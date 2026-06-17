#!/usr/bin/env node
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { runRules } from "./engine.ts"
import { ALL_RULES } from "./rules/index.ts"
import type { Finding } from "./types.ts"

interface CliOptions {
  root: string
  only?: string[]
  app?: string
  json: boolean
  strict: boolean
  quiet: boolean
}

const HELP = `rules-enforcer — enforce monorepo architectural hard rules

Usage:
  rules-enforcer [options]

Options:
  --root <dir>     Repo root to scan (default: auto-detected, else cwd)
  --rule <name>    Run only this rule (repeatable)
  --app <name>     Report findings for this app only
  --strict         Treat warnings as failures too
  --json           Emit findings as JSON
  --quiet          Print only the summary line
  --list           List available rules and exit
  -h, --help       Show this help

Exit code: 0 = clean, 1 = errors found (or warnings with --strict).

Rules: ${ALL_RULES.map((r) => r.name).join(", ")}`

/** Walk up from a start dir to find the repo root (pnpm-workspace.yaml or .git). */
function findRepoRoot(start: string): string {
  let dir = resolve(start)
  while (true) {
    if (
      existsSync(join(dir, "pnpm-workspace.yaml")) ||
      existsSync(join(dir, ".git"))
    ) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) return resolve(start) // hit filesystem root
    dir = parent
  }
}

function parseArgs(argv: string[]): CliOptions | "help" | "list" {
  const opts: CliOptions = {
    root: "",
    json: false,
    strict: false,
    quiet: false,
  }
  const only: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case "-h":
      case "--help":
        return "help"
      case "--list":
        return "list"
      case "--root":
        opts.root = argv[++i] ?? ""
        break
      case "--rule":
        only.push(argv[++i] ?? "")
        break
      case "--app":
        opts.app = argv[++i]
        break
      case "--strict":
        opts.strict = true
        break
      case "--json":
        opts.json = true
        break
      case "--quiet":
        opts.quiet = true
        break
      default:
        throw new Error(`Unknown option: ${arg} (try --help)`)
    }
  }

  if (only.length) opts.only = only
  opts.root = opts.root ? resolve(opts.root) : findRepoRoot(process.cwd())
  return opts
}

// --- pretty printing (no dependencies) ---------------------------------------

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code: string, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s)
const red = (s: string) => paint("31", s)
const yellow = (s: string) => paint("33", s)
const green = (s: string) => paint("32", s)
const dim = (s: string) => paint("2", s)
const bold = (s: string) => paint("1", s)

function printHuman(findings: Finding[], quiet: boolean): void {
  if (!quiet) {
    let currentFile = ""
    for (const f of findings) {
      if (f.file !== currentFile) {
        currentFile = f.file
        console.log(`\n${bold(currentFile)}`)
      }
      const loc = f.line ? dim(`:${f.line}`) : ""
      const tag = f.severity === "error" ? red("error") : yellow("warn ")
      console.log(`  ${tag} ${loc.padEnd(useColor ? 14 : 5)} ${f.message} ${dim(`[${f.rule}]`)}`)
      if (f.fix) console.log(`        ${dim("→ " + f.fix)}`)
    }
  }
}

// --- main --------------------------------------------------------------------

function main(): void {
  let parsed: CliOptions | "help" | "list"
  try {
    parsed = parseArgs(process.argv.slice(2))
  } catch (err) {
    console.error(red((err as Error).message))
    process.exit(2)
  }

  if (parsed === "help") {
    console.log(HELP)
    return
  }
  if (parsed === "list") {
    for (const r of ALL_RULES) console.log(`${bold(r.name)}\n  ${r.description}\n`)
    return
  }

  const opts = parsed
  let result
  try {
    result = runRules({ rootDir: opts.root, only: opts.only, app: opts.app })
  } catch (err) {
    console.error(red(`rules-enforcer failed: ${(err as Error).message}`))
    process.exit(2)
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result.findings, opts.quiet)
    const { errorCount, warningCount, filesScanned, rulesRun } = result
    const summary = `${errorCount} error(s), ${warningCount} warning(s) across ${filesScanned} files (${rulesRun.length} rules).`
    console.log(
      "\n" +
        (errorCount > 0
          ? red(`✖ ${summary}`)
          : warningCount > 0
            ? yellow(`▲ ${summary}`)
            : green(`✔ ${summary}`)),
    )
  }

  const failed = result.errorCount > 0 || (opts.strict && result.warningCount > 0)
  process.exit(failed ? 1 : 0)
}

main()
