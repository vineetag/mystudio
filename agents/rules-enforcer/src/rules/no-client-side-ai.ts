import type { Finding, Rule, RuleContext, SourceFile } from "../types.ts"
import { extractImports } from "../imports.ts"

/** AI SDKs that must never be bundled into the client. */
const AI_SDK_SPECIFIERS = [
  "@anthropic-ai/sdk",
  "@ai-sdk/",
  "anthropic",
  "openai",
  "@google/generative-ai",
  "@google/genai",
  "cohere-ai",
  "@mistralai/",
]

/** AI provider endpoints — a direct fetch from the client leaks keys. */
const AI_ENDPOINTS = [
  "api.anthropic.com",
  "api.openai.com",
  "generativelanguage.googleapis.com",
]

/** Secrets that prove server-only code leaked into a client component. */
const SERVER_SECRETS = [
  "ANTHROPIC_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_JWT_SECRET",
]

function lineOf(file: SourceFile, needle: string): number | undefined {
  const idx = file.lines.findIndex((l) => l.includes(needle))
  return idx >= 0 ? idx + 1 : undefined
}

function isAiModuleImport(spec: string, suffix: string): boolean {
  // matches "lib/ai", "@/lib/ai", "../lib/ai", "@/lib/ai.ts" etc.
  const normalized = spec.replace(/\.(ts|tsx|js|jsx)$/, "")
  return normalized === suffix || normalized.endsWith(`/${suffix}`)
}

export const noClientSideAi: Rule = {
  name: "no-client-side-ai",
  description:
    "AI and Supabase service-role calls must be server-side only. Client components must not import AI SDKs, the server-only AI module, the service-role Supabase client, or reference server secrets.",
  check(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []

    for (const file of ctx.files) {
      if (!file.isClient) continue

      // 1. Imports of AI SDKs or the server-only AI module.
      for (const { spec, line } of extractImports(file)) {
        if (AI_SDK_SPECIFIERS.some((s) => spec === s || spec.startsWith(s))) {
          findings.push({
            rule: this.name,
            severity: "error",
            file: file.rel,
            line,
            message: `Client component imports AI SDK "${spec}".`,
            fix: "Move the AI call into a Server Action or API route and call it from the client.",
          })
        }
        if (isAiModuleImport(spec, ctx.config.aiModuleSuffix)) {
          findings.push({
            rule: this.name,
            severity: "error",
            file: file.rel,
            line,
            message: `Client component imports the server-only AI module "${spec}".`,
            fix: `Keep ${ctx.config.aiModuleSuffix} server-side; expose results via a Server Action or API route.`,
          })
        }
        if (spec.includes("supabase") && /service/i.test(spec)) {
          findings.push({
            rule: this.name,
            severity: "error",
            file: file.rel,
            line,
            message: `Client component imports a service-role Supabase client ("${spec}").`,
            fix: "Use the browser/anon Supabase client on the client; keep service-role on the server.",
          })
        }
      }

      // 2. Service-role client constructed inline, even without an import.
      if (file.text.includes("createServiceClient")) {
        findings.push({
          rule: this.name,
          severity: "error",
          file: file.rel,
          line: lineOf(file, "createServiceClient"),
          message: "Client component uses createServiceClient (service-role Supabase).",
          fix: "Service-role access must run server-side only.",
        })
      }

      // 3. Server secrets referenced from the client bundle.
      for (const secret of SERVER_SECRETS) {
        if (file.text.includes(secret)) {
          findings.push({
            rule: this.name,
            severity: "error",
            file: file.rel,
            line: lineOf(file, secret),
            message: `Client component references server secret ${secret}.`,
            fix: "Secrets without the NEXT_PUBLIC_ prefix must never reach client code.",
          })
        }
      }

      // 4. Direct fetch to an AI provider endpoint from the client.
      for (const endpoint of AI_ENDPOINTS) {
        if (file.text.includes(endpoint)) {
          findings.push({
            rule: this.name,
            severity: "error",
            file: file.rel,
            line: lineOf(file, endpoint),
            message: `Client component calls AI endpoint ${endpoint} directly.`,
            fix: "Proxy AI requests through a server route so the API key stays server-side.",
          })
        }
      }
    }

    return findings
  },
}
