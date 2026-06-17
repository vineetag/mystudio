import { dirname, resolve, relative, sep } from "node:path"
import type { Finding, Rule, RuleContext, SourceFile } from "../types.ts"
import { extractImports } from "../imports.ts"

/** Which module under `<app>/modules/` does this file belong to? */
function ownerModule(rel: string, appsDir: string): { app: string; module: string } | undefined {
  const m = rel.match(new RegExp(`^${appsDir}/([^/]+)/modules/([^/]+)/`))
  if (!m) return undefined
  return { app: m[1]!, module: m[2]! }
}

/**
 * Resolve an import specifier to "<app>/modules/<module>/<remainder>" when it
 * targets a module, handling the "@/" alias (app root) and relative paths.
 * Returns undefined for imports that don't reach into a module.
 */
function resolveModuleTarget(
  file: SourceFile,
  spec: string,
  appsDir: string,
): { module: string; remainder: string } | undefined {
  let modulesRelative: string | undefined

  if (spec.startsWith("@/")) {
    // "@/" maps to the app root → "@/modules/x/y" => "modules/x/y"
    if (spec.startsWith("@/modules/")) modulesRelative = spec.slice("@/".length)
  } else if (spec.startsWith(".")) {
    // Resolve a relative import against the file, then express it app-relative.
    const abs = resolve(dirname(file.abs), spec)
    const appRootAbs = file.abs.slice(0, file.abs.indexOf(`${sep}modules${sep}`))
    const relToApp = relative(appRootAbs, abs).split(sep).join("/")
    if (relToApp.startsWith("modules/")) modulesRelative = relToApp
  }

  if (!modulesRelative) return undefined
  const m = modulesRelative.match(/^modules\/([^/]+)\/(.+)$/)
  if (!m) return undefined
  return { module: m[1]!, remainder: m[2]! }
}

function isIndexEntry(remainder: string): boolean {
  // Importing the module's public surface is allowed.
  return remainder === "index" || /^index\.(ts|tsx|js|jsx)$/.test(remainder)
}

export const noCrossModuleImports: Rule = {
  name: "no-cross-module-imports",
  description:
    "Modules must not reach into another module's internals. Cross-module imports must go through that module's index.ts (its public surface).",
  check(ctx: RuleContext): Finding[] {
    const findings: Finding[] = []
    const appsDir = ctx.config.appsDir

    for (const file of ctx.files) {
      const owner = ownerModule(file.rel, appsDir)
      if (!owner) continue

      for (const { spec, line } of extractImports(file)) {
        const target = resolveModuleTarget(file, spec, appsDir)
        if (!target) continue
        if (target.module === owner.module) continue // same module — fine
        if (isIndexEntry(target.remainder)) continue // through the index — fine

        findings.push({
          rule: this.name,
          severity: "error",
          file: file.rel,
          line,
          message: `Module "${owner.module}" imports internals of module "${target.module}" ("${spec}").`,
          fix: `Import from "modules/${target.module}" (its index.ts) and export what you need there.`,
        })
      }
    }

    return findings
  },
}
