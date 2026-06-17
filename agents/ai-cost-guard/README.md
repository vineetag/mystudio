# @appcrafter/ai-cost-guard

A zero-dependency CLI that keeps AI spend **safe and centralized**. It statically
verifies that every AI call in the repo flows through one audited module, and
that the module actually enforces the guardrails that protect your wallet.

> Why static, not an LLM? These are structural facts — *where* AI is called and
> *whether* caps exist — so a deterministic check is free, instant, and runs on
> every push. (Fuzzy judgment, like screening generated content, is what LLM
> agents are for.)

## Rules

| Rule | Severity | What it catches |
|------|----------|-----------------|
| `ai-calls-through-module` | error | Any file outside the audited AI module (`lib/ai`) that imports an AI SDK or constructs an AI client directly — bypassing rate limits and the spend cap. Also errors if AI SDKs are used but no AI module exists at all. |
| `caps-enforced` | error | The AI module missing a detectable **monthly spend cap** or **per-user rate limit**. |
| `system-prompt-required` | warning | A model invocation in the AI module with no `system` prompt nearby (raw user input risks prompt injection). |

`error` findings fail the process (exit 1). `warning` findings pass unless
`--strict`.

> **These are heuristics.** The guard can't prove your cap logic is *correct* —
> it proves the guardrails *exist and are centralized*, which is what silently
> regresses in a PR. Pair it with tests of the actual limit logic.

## Usage

```bash
node agents/ai-cost-guard/src/cli.ts          # from repo root (Node 24)
npx @appcrafter/ai-cost-guard --strict        # once published / built
ai-cost-guard --rule caps-enforced --json
ai-cost-guard --list
```

## Configuration

Optional `ai-cost-guard.config.json` at the repo root. Each key you set replaces
its default.

```jsonc
{
  "scanDirs": ["apps", "packages"],
  "aiModuleSuffix": "lib/ai",
  "aiSdkSpecifiers": ["@anthropic-ai/sdk", "@ai-sdk/", "openai", "ai"],
  "spendCapKeywords": ["MONTHLY", "BUDGET", "spend", "ceiling"],
  "rateLimitKeywords": ["DAILY", "LIMIT", "rate", "slot", "quota", "throttle"],
  "modelCallPatterns": ["messages.create", "generateText", "streamText"],
  "systemPromptWindow": 40,
  "disabledRules": [],
  "ignoreDirs": []
}
```

## Programmatic API

```ts
import { runRules } from "@appcrafter/ai-cost-guard"
const { findings, errorCount } = runRules({ rootDir: process.cwd() })
```

## Wiring

- **CI**: `.github/workflows/ai-cost-guard.yml`
- **pnpm**: `pnpm agents:cost`
- **Claude Code**: `.claude/agents/ai-cost-guard.md`

See [`../README.md`](../README.md) for the full catalog.

## License

MIT
