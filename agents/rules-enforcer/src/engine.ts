import { existsSync, readdirSync } from "node:fs"
import { join, relative, sep } from "node:path"
import type { Finding, ResolvedConfig, RuleContext, SourceFile } from "./types.ts"
import { loadConfig } from "./config.ts"
import { walk, readText } from "./walk.ts"
import { ALL_RULES } from "./rules/index.ts"

const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]

/** Repo-relative path with POSIX separators, for stable cross-platform output. */
export function toRel(rootDir: string, abs: string): string {
  return relative(rootDir, abs).split(sep).join("/")
}

/** First non-empty, non-comment line begins a "use client" directive. */
function detectClient(text: string): boolean {
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (line === "" || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
      continue
    }
    return /^["']use client["']/.test(line)
  }
  return false
}

function appOf(rel: string, appsDir: string): string | undefined {
  const prefix = `${appsDir}/`
  if (!rel.startsWith(prefix)) return undefined
  return rel.slice(prefix.length).split("/")[0]
}

function listApps(rootDir: string, appsDir: string): string[] {
  const dir = join(rootDir, appsDir)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort()
}

function gatherFiles(rootDir: string, config: ResolvedConfig): SourceFile[] {
  const files: SourceFile[] = []
  for (const scanDir of config.scanDirs) {
    const base = join(rootDir, scanDir)
    if (!existsSync(base)) continue
    for (const abs of walk(base, { exts: SOURCE_EXTS, ignoreDirs: config.ignoreDirs })) {
      const text = readText(abs)
      const rel = toRel(rootDir, abs)
      files.push({
        abs,
        rel,
        app: appOf(rel, config.appsDir),
        isClient: detectClient(text),
        text,
        lines: text.split("\n"),
      })
    }
  }
  return files
}

export interface RunOptions {
  rootDir: string
  /** Only run these rules (by name). Omitted = all enabled rules. */
  only?: string[]
  /** Only report findings for this app. */
  app?: string
}

export interface RunResult {
  findings: Finding[]
  errorCount: number
  warningCount: number
  filesScanned: number
  rulesRun: string[]
}

export function runRules(opts: RunOptions): RunResult {
  const { rootDir } = opts
  const config = loadConfig(rootDir)
  const apps = listApps(rootDir, config.appsDir)
  const files = gatherFiles(rootDir, config)

  const ctx: RuleContext = { rootDir, config, apps, files }

  const rulesRun: string[] = []
  let findings: Finding[] = []
  for (const rule of ALL_RULES) {
    if (config.disabledRules.includes(rule.name)) continue
    if (opts.only && !opts.only.includes(rule.name)) continue
    rulesRun.push(rule.name)
    try {
      findings.push(...rule.check(ctx))
    } catch (err) {
      // A broken rule must never mask other findings or pass CI silently.
      findings.push({
        rule: rule.name,
        severity: "error",
        file: ".",
        message: `Rule "${rule.name}" crashed: ${(err as Error).message}`,
        fix: "This is a bug in the rule itself — report it.",
      })
    }
  }

  if (opts.app) {
    findings = findings.filter((f) => f.file.startsWith(`${config.appsDir}/${opts.app}/`))
  }

  findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      a.rule.localeCompare(b.rule),
  )

  return {
    findings,
    errorCount: findings.filter((f) => f.severity === "error").length,
    warningCount: findings.filter((f) => f.severity === "warning").length,
    filesScanned: files.length,
    rulesRun,
  }
}
