export type Severity = "error" | "warning"

/** A single rule violation, anchored to a file (and line when known). */
export interface Finding {
  rule: string
  severity: Severity
  /** Repo-relative path, POSIX separators. */
  file: string
  /** 1-based line number, when the violation is on a specific line. */
  line?: number
  message: string
  /** Short, actionable remedy shown after the message. */
  fix?: string
}

/** A source file we have read into memory and pre-parsed. */
export interface SourceFile {
  /** Absolute path. */
  abs: string
  /** Repo-relative path, POSIX separators. */
  rel: string
  /** Owning app name if the file is under `<appsDir>/<app>/`, else undefined. */
  app?: string
  /** True when the file opens with a "use client" directive. */
  isClient: boolean
  text: string
  lines: string[]
}

/** Fully-resolved configuration (defaults merged with the user's config file). */
export interface ResolvedConfig {
  /** Directory (repo-relative) holding the apps. */
  appsDir: string
  /** Directories scanned for source files. */
  scanDirs: string[]
  /** Routes every app must expose (App Router top-level segments). */
  requiredRoutes: string[]
  /**
   * Acceptable substitutes for a required route. Key = required route,
   * value = list of alternatives. The empty string "" means the app's root
   * `app/page.tsx` satisfies it.
   */
  routeAliases: Record<string, string[]>
  /** Import suffix that identifies the server-only AI module, e.g. "lib/ai". */
  aiModuleSuffix: string
  /** Directory (relative to an app) where SQL migrations must live. */
  migrationsDir: string
  /** Rule names to skip entirely. */
  disabledRules: string[]
  /** Extra path segments to ignore while walking (added to built-ins). */
  ignoreDirs: string[]
}

/** Everything a rule needs to do its job. */
export interface RuleContext {
  /** Absolute repo root. */
  rootDir: string
  config: ResolvedConfig
  /** App directory names discovered under `appsDir`. */
  apps: string[]
  /** All source files under `scanDirs`. */
  files: SourceFile[]
}

export interface Rule {
  name: string
  description: string
  check(ctx: RuleContext): Finding[]
}
