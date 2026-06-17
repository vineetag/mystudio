import type { Finding, Rule, RuleContext, SourceFile } from "../types.ts"

/**
 * Heuristic secret patterns. These match the *shape of a real key value*, not a
 * mere mention, to avoid flagging variable names like ANTHROPIC_API_KEY (which
 * is exactly how you SHOULD reference a secret — via env).
 *
 * This is a fast local pre-check; Gitleaks (in .github/workflows) remains the
 * authoritative secret gate. Hence severity = "warning".
 */
const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { label: "OpenAI-style API key", re: /\bsk-[A-Za-z0-9]{32,}/ },
  { label: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: "Stripe live key", re: /\b(sk|rk)_live_[0-9A-Za-z]{20,}/ },
  // JWT (e.g. a Supabase service_role key pasted as a literal).
  { label: "JWT / service key", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
]

function isSkippable(file: SourceFile): boolean {
  const r = file.rel
  return (
    /\.(test|spec)\.[tj]sx?$/.test(r) ||
    r.includes("__tests__/") ||
    r.includes("/fixtures/") ||
    r.includes(".example") ||
    // Don't scan this agent's own source — it contains the patterns above.
    r.includes("agents/rules-enforcer/")
  )
}

export const noSecretsInCode: Rule = {
  name: "no-secrets-in-code",
  description:
    "No hardcoded secrets in source. Secrets belong in .env files referenced via process.env. (Fast pre-check; Gitleaks is the authoritative gate.)",
  check(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []

    for (const file of ctx.files) {
      if (isSkippable(file)) continue
      file.lines.forEach((line, i) => {
        for (const { label, re } of SECRET_PATTERNS) {
          if (re.test(line)) {
            findings.push({
              rule: this.name,
              severity: "warning",
              file: file.rel,
              line: i + 1,
              message: `Possible hardcoded ${label} in source.`,
              fix: "Move it to a .env file and read it via process.env. Then rotate the exposed key.",
            })
            break // one finding per line is enough
          }
        }
      })
    }

    return findings
  },
}
