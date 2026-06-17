# @appcrafter/rules-enforcer

A zero-dependency CLI that enforces a monorepo's **architectural hard rules** —
the kind that are easy to break silently in a PR and painful to fix later. Built
for the [AppCrafter Studio](https://appcrafter.studio) Next.js + Supabase
monorepo, but every rule is config-driven, so it works in any repo.

> Deterministic, not AI. These rules are machine-checkable (imports, file
> existence, string shapes), so a plain static check is free, instant, and
> reproducible — no API key, no token spend. Reserve LLM agents for fuzzy
> judgment.

## Rules

| Rule | Severity | What it catches |
|------|----------|-----------------|
| `no-client-side-ai` | error | Client components (`"use client"`) importing an AI SDK, the server-only AI module, a service-role Supabase client, referencing server secrets, or fetching an AI endpoint directly. Enforces "all AI/Supabase calls are server-side only". |
| `no-cross-module-imports` | error | One module importing another module's internals instead of going through its `index.ts` public surface. |
| `required-app-pages` | error | An app missing a required route (`overview`, `release-notes`, `privacy`, `disclaimer`, `admin` by default). |
| `no-secrets-in-code` | warning | Hardcoded secret-shaped literals (Anthropic/OpenAI/AWS/Google/Stripe keys, JWTs). Fast pre-check; Gitleaks remains the authoritative gate. |
| `sql-migrations` | warning | `.sql` files outside the migrations dir, or migration filenames without a version prefix. Enforces "DB changes go through versioned migrations". |

`error` findings fail the process (exit 1). `warning` findings inform but pass,
unless you run with `--strict`.

## Usage

```bash
# From the repo root (Node 24 runs the TS source directly):
node agents/rules-enforcer/src/cli.ts

# Or once published / built:
npx @appcrafter/rules-enforcer --strict
rules-enforcer --rule no-client-side-ai --app kids-stories
rules-enforcer --json          # machine-readable output for tooling
rules-enforcer --list          # list rules and descriptions
rules-enforcer --help
```

### Options

| Flag | Effect |
|------|--------|
| `--root <dir>` | Repo root to scan (default: auto-detected via `pnpm-workspace.yaml`/`.git`, else cwd). |
| `--rule <name>` | Run only this rule. Repeatable. |
| `--app <name>` | Report findings for one app only. |
| `--strict` | Treat warnings as failures. |
| `--json` | Emit findings as JSON. |
| `--quiet` | Print only the summary line. |

## Configuration

Drop a `rules-enforcer.config.json` at the repo root. All keys are optional;
anything you set replaces that default outright.

```jsonc
{
  "appsDir": "apps",
  "scanDirs": ["apps", "packages"],
  "requiredRoutes": ["overview", "release-notes", "privacy", "disclaimer", "admin"],
  // Treat the app's landing page as its overview ("" = root app/page.tsx).
  // Remove this to require a dedicated /overview route.
  "routeAliases": { "overview": [""] },
  "aiModuleSuffix": "lib/ai",
  "migrationsDir": "supabase/migrations",
  "disabledRules": [],     // e.g. ["sql-migrations"]
  "ignoreDirs": []          // extra dir names to skip while walking
}
```

## Programmatic API

```ts
import { runRules } from "@appcrafter/rules-enforcer"

const { findings, errorCount } = runRules({ rootDir: process.cwd() })
```

## How it's wired in this repo

- **CI**: `.github/workflows/rules-enforcer.yml` runs it on every push/PR.
- **pnpm**: `pnpm agents:rules` from the repo root.
- **Claude Code**: `.claude/agents/rules-enforcer.md` wraps the CLI so Claude can
  run it and explain findings.

See [`../README.md`](../README.md) for the full agent catalog and triggering
model.

## License

MIT
