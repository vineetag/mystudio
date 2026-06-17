import type { SourceFile } from "./types.ts"

export interface ImportRef {
  spec: string
  line: number
}

const PATTERNS = [
  /\bfrom\s+["']([^"']+)["']/,
  /\bimport\s+["']([^"']+)["']/,
  /\bimport\(\s*["']([^"']+)["']\s*\)/,
  /\brequire\(\s*["']([^"']+)["']\s*\)/,
]

/** Extract every module specifier and its line number (no AST, no deps). */
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
