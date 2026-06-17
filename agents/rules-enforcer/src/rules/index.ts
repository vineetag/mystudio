import type { Rule } from "../types.ts"
import { noClientSideAi } from "./no-client-side-ai.ts"
import { noSecretsInCode } from "./no-secrets-in-code.ts"
import { noCrossModuleImports } from "./no-cross-module-imports.ts"
import { requiredAppPages } from "./required-app-pages.ts"
import { sqlMigrations } from "./sql-migrations.ts"

export const ALL_RULES: Rule[] = [
  noClientSideAi,
  noSecretsInCode,
  noCrossModuleImports,
  requiredAppPages,
  sqlMigrations,
]
