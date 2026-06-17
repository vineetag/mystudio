export type Severity = "error" | "warning"

export interface Finding {
  rule: string
  severity: Severity
  file: string
  line?: number
  message: string
  fix?: string
}

export interface SourceFile {
  abs: string
  /** Repo-relative path, POSIX separators. */
  rel: string
  /** True if this file IS the audited AI module (path ends with aiModuleSuffix). */
  isAiModule: boolean
  text: string
  lines: string[]
}

export interface ResolvedConfig {
  /** Directories scanned for source files. */
  scanDirs: string[]
  /** Import suffix identifying the single audited AI module, e.g. "lib/ai". */
  aiModuleSuffix: string
  /** Package specifiers that indicate a direct AI SDK call. */
  aiSdkSpecifiers: string[]
  /** Source snippets that indicate an AI client is being constructed inline. */
  aiClientConstructors: string[]
  /** Substrings proving a monthly spend cap is enforced in the AI module. */
  spendCapKeywords: string[]
  /** Substrings proving a per-user rate limit is enforced in the AI module. */
  rateLimitKeywords: string[]
  /** Model-invocation call sites to check for an accompanying system prompt. */
  modelCallPatterns: string[]
  /** How many lines around a model call to search for a system prompt. */
  systemPromptWindow: number
  disabledRules: string[]
  ignoreDirs: string[]
}

export interface RuleContext {
  rootDir: string
  config: ResolvedConfig
  files: SourceFile[]
  /** Files that are the audited AI module. */
  aiModules: SourceFile[]
}

export interface Rule {
  name: string
  description: string
  check(ctx: RuleContext): Finding[]
}
