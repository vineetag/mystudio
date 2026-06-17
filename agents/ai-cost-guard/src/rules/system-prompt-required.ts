import type { Finding, Rule, RuleContext, SourceFile } from "../types.ts"

/** Look for a `system` prompt within a window of lines around `line` (0-based). */
function hasSystemPromptNear(file: SourceFile, line: number, window: number): boolean {
  const start = Math.max(0, line - window)
  const end = Math.min(file.lines.length, line + window)
  for (let i = start; i < end; i++) {
    // matches `system:` (object field) or `system =`/`system,` references
    if (/\bsystem\s*[:=,]/.test(file.lines[i] ?? "")) return true
  }
  return false
}

/**
 * Every model invocation in the AI module should pass a system prompt — never
 * send raw user input straight to a model. Heuristic and best-effort, hence a
 * warning: it scans for a `system` field near each model call.
 */
export const systemPromptRequired: Rule = {
  name: "system-prompt-required",
  description:
    "Model calls must include a system prompt — never send raw user input to a model. Flags model invocations with no nearby system prompt.",
  check(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const { modelCallPatterns, systemPromptWindow } = ctx.config

    for (const mod of ctx.aiModules) {
      mod.lines.forEach((lineText, i) => {
        if (!modelCallPatterns.some((p) => lineText.includes(p))) return
        if (hasSystemPromptNear(mod, i, systemPromptWindow)) return
        findings.push({
          rule: this.name,
          severity: "warning",
          file: mod.rel,
          line: i + 1,
          message: "Model call with no system prompt detected nearby.",
          fix: "Always pass a `system` prompt and treat user input strictly as data, not instructions.",
        })
      })
    }

    return findings
  },
}
