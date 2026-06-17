import { existsSync } from "node:fs"
import { join, relative, sep } from "node:path"
import type { Finding, Rule, RuleContext } from "../types.ts"
import { walk } from "../walk.ts"

const PAGE_FILE = /(^|\/)page\.(tsx|ts|jsx|js|mdx|md)$/

/** Locate the App Router base: prefer `app/`, fall back to `src/app/`. */
function appRouterBase(appAbs: string): string | undefined {
  for (const candidate of ["app", join("src", "app")]) {
    const abs = join(appAbs, candidate)
    if (existsSync(abs)) return abs
  }
  return undefined
}

/**
 * Turn a page file path into its route's top-level segment. Strips route groups
 * `(marketing)`, parallel routes `@modal`, and the trailing `/page.*`.
 * Returns "" for the app's root page.
 */
function topSegment(routerBase: string, pageAbs: string): string {
  const rel = relative(routerBase, pageAbs).split(sep).join("/")
  const segments = rel
    .replace(PAGE_FILE, "")
    .split("/")
    .filter((s) => s !== "" && !s.startsWith("(") && !s.startsWith("@"))
  return segments[0] ?? ""
}

export const requiredAppPages: Rule = {
  name: "required-app-pages",
  description:
    "Every app must expose the studio's required routes (overview, release-notes, privacy, disclaimer, admin). Configurable via requiredRoutes / routeAliases.",
  check(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const { appsDir, requiredRoutes, routeAliases } = ctx.config

    for (const app of ctx.apps) {
      const appAbs = join(ctx.rootDir, appsDir, app)
      const routerBase = appRouterBase(appAbs)
      if (!routerBase) continue // not a Next.js App Router app — skip

      const present = new Set<string>()
      for (const pageAbs of walk(routerBase, { ignoreDirs: ctx.config.ignoreDirs })) {
        if (PAGE_FILE.test(pageAbs.split(sep).join("/"))) {
          present.add(topSegment(routerBase, pageAbs))
        }
      }

      for (const route of requiredRoutes) {
        const accepted = [route, ...(routeAliases[route] ?? [])]
        if (accepted.some((r) => present.has(r))) continue
        findings.push({
          rule: this.name,
          severity: "error",
          file: `${appsDir}/${app}`,
          message: `App "${app}" is missing the required /${route} route.`,
          fix: `Add app/${route}/page.tsx${
            routeAliases[route]?.length
              ? ` (or one of: ${routeAliases[route].map((a) => a || "root page").join(", ")})`
              : ""
          }.`,
        })
      }
    }

    return findings
  },
}
