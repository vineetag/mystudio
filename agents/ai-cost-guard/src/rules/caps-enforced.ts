import type { Finding, Rule, RuleContext, SourceFile } from "../types.ts"

/** Does the module mention any of these keywords (case-insensitive)? */
function mentionsAny(file: SourceFile, keywords: string[]): boolean {
  const lower = file.text.toLowerCase()
  return keywords.some((k) => lower.includes(k.toLowerCase()))
}

/**
 * Heuristic check that the audited AI module enforces BOTH a monthly spend cap
 * and a per-user rate limit. It can't prove the logic is correct, but it
 * reliably catches an AI module that simply forgot one of them.
 *
 * If AI SDKs are used somewhere but NO AI module exists at all, that's a hard
 * error — there's nowhere for the caps to live.
 */
export const capsEnforced: Rule = {
  name: "caps-enforced",
  description:
    "The audited AI module must enforce a hard monthly spend cap and a per-user rate limit. (Both are studio hard rules.)",
  check(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const { spendCapKeywords, rateLimitKeywords, aiSdkSpecifiers } = ctx.config

    if (ctx.aiModules.length === 0) {
      const usesAi = ctx.files.some((f) =>
        aiSdkSpecifiers.some((s) => f.text.includes(s)),
      )
      if (usesAi) {
        findings.push({
          rule: this.name,
          severity: "error",
          file: ".",
          message: `AI SDKs are used but no audited AI module (${ctx.config.aiModuleSuffix}) was found.`,
          fix: `Create ${ctx.config.aiModuleSuffix} and route all AI calls through it, enforcing rate limits and a spend cap.`,
        })
      }
      return findings
    }

    for (const mod of ctx.aiModules) {
      if (!mentionsAny(mod, spendCapKeywords)) {
        findings.push({
          rule: this.name,
          severity: "error",
          file: mod.rel,
          message: "AI module has no detectable monthly spend cap.",
          fix: `Enforce a hard monthly USD ceiling (look for one of: ${spendCapKeywords.join(", ")}).`,
        })
      }
      if (!mentionsAny(mod, rateLimitKeywords)) {
        findings.push({
          rule: this.name,
          severity: "error",
          file: mod.rel,
          message: "AI module has no detectable per-user rate limit.",
          fix: `Enforce a per-user limit (look for one of: ${rateLimitKeywords.join(", ")}).`,
        })
      }
    }

    return findings
  },
}
