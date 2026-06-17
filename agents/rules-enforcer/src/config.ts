import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { ResolvedConfig } from "./types.ts"

export const DEFAULT_CONFIG: ResolvedConfig = {
  appsDir: "apps",
  scanDirs: ["apps", "packages"],
  requiredRoutes: [
    "overview",
    "release-notes",
    "privacy",
    "disclaimer",
    "admin",
  ],
  // By default the studio expects a dedicated /overview route. If you treat the
  // app's landing page as its overview, add "" here via the config file.
  routeAliases: {},
  aiModuleSuffix: "lib/ai",
  migrationsDir: "supabase/migrations",
  disabledRules: [],
  ignoreDirs: [],
}

const CONFIG_FILENAMES = [
  "rules-enforcer.config.json",
  ".rules-enforcer.json",
]

/**
 * Load and merge the repo's config file (if any) over the defaults. Unknown
 * keys are ignored; arrays/objects from the file replace the default entirely
 * (no deep merge) so the file is the single source of truth for what it sets.
 */
export function loadConfig(rootDir: string): ResolvedConfig {
  for (const name of CONFIG_FILENAMES) {
    const path = join(rootDir, name)
    if (!existsSync(path)) continue
    let parsed: Partial<ResolvedConfig>
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"))
    } catch (err) {
      throw new Error(
        `Could not parse ${name}: ${(err as Error).message}. Fix the JSON or remove the file.`,
      )
    }
    return { ...DEFAULT_CONFIG, ...parsed }
  }
  return { ...DEFAULT_CONFIG }
}
