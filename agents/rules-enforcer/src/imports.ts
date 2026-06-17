import type { SourceFile } from "./types.ts"

export interface ImportRef {
  /** The module specifier, e.g. "@/lib/ai" or "@anthropic-ai/sdk". */
  spec: string
  /** 1-based line where the specifier appears. */
  line: number
}

const PATTERNS = [
  /\bfrom\s+["']([^"']+)["']/, // import x from "spec" / export x from "spec"
  /\bimport\s+["']([^"']+)["']/, // import "spec" (side-effect)
  /\bimport\(\s*["']([^"']+)["']\s*\)/, // dynamic import("spec")
  /\brequire\(\s*["']([^"']+)["']\s*\)/, // require("spec")
]

/**
 * Extract every module specifier and its line number. Works line-by-line, which
 * correctly handles multi-line `import { ... } from "x"` because the `from`
 * clause sits on its own line. Good enough without a full AST parser, and keeps
 * the package dependency-free.
 */
export function extractImports(file: SourceFile): ImportRef[] {
  const refs: ImportRef[] = []
  file.lines.forEach((line, i) => {
    for (const pattern of PATTERNS) {
      const m = line.match(pattern)
      if (m?.[1]) {
        refs.push({ spec: m[1], line: i + 1 })
        break
      }
    }
  })
  return refs
}
