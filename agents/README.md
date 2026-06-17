# AppCrafter Agents

Open-source agents that keep the [AppCrafter Studio](https://appcrafter.studio)
monorepo healthy. Each agent here is **generic** — it reads conventions from
config, never hard-codes anything app-specific — so it works across every
current and future app in the studio (and in your repo too).

> **Two tiers of agents.**
>
> | Tier | Lives in | Scope | This folder? |
> |------|----------|-------|--------------|
> | **Dev-workflow agents** | `agents/<name>/` | Cross-app. Lint, audit, enforce conventions, generate scaffolding. Run in CI / git hooks / Claude Code. | ✅ yes |
> | **App-level agents** | `apps/<app>/modules/agents/<name>/` | Runtime AI features specific to one app (e.g. story safety screening). | ❌ no — they ship with the app |
>
> Only **dev-workflow** agents live here, because only they are reusable and
> safe to open-source. App-level agents stay private with their app since they
> encode product logic. Example app-level agent:
> [`apps/kids-stories/modules/safety`](../apps/kids-stories/modules/safety) —
> an LLM screener that checks generated stories for age-appropriateness before
> they reach a child.

> **Sharing code between agents.** Each agent here is intentionally standalone
> (zero inter-dependencies) so it can be published and adopted on its own. The
> small `walk`/`imports`/CLI helpers are therefore duplicated per agent. If this
> suite grows, extract a shared `@appcrafter/agent-core` package and depend on
> it (the eslint-core + plugins model).

## Agents in this folder

| Agent | What it does | Trigger |
|-------|--------------|---------|
| [`rules-enforcer`](./rules-enforcer) | Enforces the studio's `CLAUDE.md` "hard rules" — no client-side AI/Supabase, no hardcoded secrets, no cross-module imports, required pages per app, SQL-migration discipline. | CI on every push/PR, `pnpm agents:rules`, `git push` (hook), or Claude Code subagent. |
| [`ai-cost-guard`](./ai-cost-guard) | Verifies every AI call routes through `lib/ai.ts` and that rate limits, a monthly spend cap, and a system prompt are enforced. Protects the wallet. | CI on every push/PR, `pnpm agents:cost`, or Claude Code subagent. |

## How agents are triggered

Each dev-workflow agent is a plain CLI, so it can be invoked four ways — pick
the layers you want:

1. **CI (GitHub Actions)** — the primary gate. A workflow runs the agent on
   every push and PR; a failure blocks merge. See
   `.github/workflows/rules-enforcer.yml`.
2. **Pre-push git hook** — fast local feedback before code leaves your machine.
   The repo already uses `.githooks/` (run `git config core.hooksPath .githooks`
   once after cloning). Hooks call the same CLI.
3. **Manual / pnpm script** — `pnpm agents:rules`, `pnpm agents:cost`, etc.,
   wired in the root `package.json`.
4. **Claude Code subagent** — each agent ships a thin wrapper in
   `.claude/agents/<name>.md` that runs the CLI and explains findings
   conversationally. Invoke with `@rules-enforcer` (or let Claude auto-delegate)
   inside a Claude Code session.

> **Why deterministic CLIs, not LLM calls, for these two?**
> Their rules are *machine-checkable* (imports, file existence, string
> patterns). A deterministic check is free, instant, reproducible, and runs on
> every push with no API key — far better than asking a model the same question
> repeatedly. We reserve LLM-powered agents for **fuzzy judgment** (e.g. the
> app-level `story-safety` agent, which decides whether prose is
> age-appropriate). Match the tool to the task.

## Running locally

```bash
# from the repo root
pnpm agents:rules          # run the rules-enforcer
pnpm agents:cost           # run the ai-cost-guard

# or directly (Node 24 runs the TypeScript source as-is)
node agents/rules-enforcer/src/cli.ts --root .
```

## Conventions for new agents in this folder

- Self-contained package, scoped `@appcrafter/<name>`, publishable to npm.
- **Zero runtime dependencies** — Node built-ins only — so consumers install
  nothing transitive. Dev deps (TypeScript) are fine.
- Configuration over hard-coding: read a `<name>.config.json` from the repo
  root, ship sane defaults, document every option.
- Exit non-zero on `error`-severity findings so CI fails. `warning` findings
  inform but don't block (override with `--strict`).
- Ship a `--json` output mode for tooling, and a `.claude/agents/<name>.md`
  wrapper for Claude Code.
- A `README.md` documenting every rule/check and how to disable it.
