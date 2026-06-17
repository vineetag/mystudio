import type { Finding, Rule, RuleContext, SourceFile } from "../types.ts"
import { extractImports } from "../imports.ts"

function firstLine(file: SourceFile, needle: string): number | undefined {
  const idx = file.lines.findIndex((l) => l.includes(needle))
  return idx >= 0 ? idx + 1 : undefined
}

export const aiCallsThroughModule: Rule = {
  name: "ai-calls-through-module",
  description:
    "Every AI call must route through the single audited AI module (lib/ai). No component, page, or other module may import an AI SDK or construct an AI client directly.",
  check(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const { aiSdkSpecifiers, aiClientConstructors } = ctx.config

    for (const file of ctx.files) {
      if (file.isAiModule) continue // the module is allowed to use the SDK

      for (const { spec, line } of extractImports(file)) {
        if (aiSdkSpecifiers.some((s) => spec === s || spec.startsWith(s))) {
          findings.push({
            rule: this.name,
            severity: "error",
            file: file.rel,
            line,
            message: `Direct AI SDK import "${spec}" outside the audited AI module.`,
            fix: `Call AI through ${ctx.config.aiModuleSuffix} so rate limits and the spend cap are enforced.`,
          })
        }
      }

      for (const ctor of aiClientConstructors) {
        if (file.text.includes(ctor)) {
          findings.push({
            rule: this.name,
            severity: "error",
            file: file.rel,
            line: firstLine(file, ctor),
            message: `AI client constructed directly ("${ctor}") outside the audited AI module.`,
            fix: `Move client construction into ${ctx.config.aiModuleSuffix}; export typed functions instead.`,
          })
        }
      }
    }

    return findings
  },
}
