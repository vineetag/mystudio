import { existsSync } from "node:fs"
import { join, relative, sep } from "node:path"
import type { Finding, ResolvedConfig, RuleContext, SourceFile } from "./types.ts"
import { loadConfig } from "./config.ts"
import { walk, readText } from "./walk.ts"
import { ALL_RULES } from "./rules/index.ts"

const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]

export function toRel(rootDir: string, abs: string): string {
  return relative(rootDir, abs).split(sep).join("/")
}

/** Path ends with the AI module suffix, e.g. ".../lib/ai.ts". */
function isAiModulePath(rel: string, suffix: string): boolean {
  const normalized = rel.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, "")
  return normalized === suffix || normalized.endsWith(`/${suffix}`)
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
        isAiModule: isAiModulePath(rel, config.aiModuleSuffix),
        text,
        lines: text.split("\n"),
      })
    }
  }
  return files
}

export interface RunOptions {
  rootDir: string
  only?: string[]
}

export interface RunResult {
  findings: Finding[]
  errorCount: number
  warningCount: number
  filesScanned: number
  aiModuleCount: number
  rulesRun: string[]
}

export function runRules(opts: RunOptions): RunResult {
  const { rootDir } = opts
  const config = loadConfig(rootDir)
  const files = gatherFiles(rootDir, config)
  const aiModules = files.filter((f) => f.isAiModule)

  const ctx: RuleContext = { rootDir, config, files, aiModules }

  const rulesRun: string[] = []
  const findings: Finding[] = []
  for (const rule of ALL_RULES) {
    if (config.disabledRules.includes(rule.name)) continue
    if (opts.only && !opts.only.includes(rule.name)) continue
    rulesRun.push(rule.name)
    try {
      findings.push(...rule.check(ctx))
    } catch (err) {
      findings.push({
        rule: rule.name,
        severity: "error",
        file: ".",
        message: `Rule "${rule.name}" crashed: ${(err as Error).message}`,
        fix: "This is a bug in the rule itself — report it.",
      })
    }
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
    aiModuleCount: aiModules.length,
    rulesRun,
  }
}
