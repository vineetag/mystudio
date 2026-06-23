# AGENTS.md

See `CLAUDE.md` and `README.md` for the full architecture, stack, and contribution rules. This file adds environment-specific operating notes.

## Cursor Cloud specific instructions

### What this repo is
A Turborepo monorepo of 4 Next.js 15 apps + shared packages (`packages/ui`, `packages/config`, `packages/analytics`) and two zero-dependency TS CLI agents (`agents/rules-enforcer`, `agents/ai-cost-guard`). Standard commands live in the root `package.json` and per-app `package.json`; use those instead of inventing new ones (`pnpm dev|lint|typecheck|build`, `pnpm --filter @studio/<app> dev`, `pnpm agents:rules`, `pnpm agents:cost`, `pnpm test:e2e`).

### Apps and dev ports
| App | Package | Dev port | Runs without secrets? |
|---|---|---|---|
| web (portfolio hub) | `@studio/web` | 3000 | Yes — fully functional |
| kids-stories (ZippyTales) | `@studio/kids-stories` | 3001 | No — see below |
| math-workbook | `@studio/math-workbook` | 3002 | Yes (coming-soon placeholder) |
| wealth | `@studio/wealth` | 3003 | Yes (coming-soon placeholder) |

Run one app with e.g. `pnpm --filter @studio/web dev`. Each app reads `apps/<app>/.env.local` (gitignored; copy from `apps/<app>/.env.example`).

### Non-obvious gotchas
- **Agent CLIs need a newer Node than the VM default.** `pnpm agents:rules` / `pnpm agents:cost` execute TypeScript directly via `node agents/.../cli.ts`. The VM's default `node` (`/exec-daemon/node`, v22.14.0) cannot strip TS types and fails with `ERR_UNKNOWN_FILE_EXTENSION`. Use the nvm Node that ships on the VM, e.g. `~/.nvm/versions/node/v22.22.2/bin/node agents/rules-enforcer/src/cli.ts --root .`, or pass `--experimental-strip-types`. CI uses Node 24. (Lint/typecheck/build/dev all work fine on the default node.)
- **`kids-stories` returns HTTP 500 without Supabase env.** Its `middleware.ts` calls `createServerClient` on every request, which throws when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are empty. To run it end-to-end you need a real Supabase project (URL + anon + service-role keys), `ANTHROPIC_API_KEY` for story generation, and applied DB migrations via `./scripts/setup-db.sh kids-stories` (needs `DATABASE_URL` + `psql`). Without those secrets, demo the `web` app instead.
- **`web` contact form works with no secrets in dev.** When `RESEND_API_KEY` is unset and `NODE_ENV !== production`, `lib/email.ts` logs the submission and returns success, so the form completes end-to-end locally.
- **E2E (`pnpm test:e2e`)** runs Playwright against a deployed preview, not a local server: it needs `pnpm exec playwright install chromium`, plus `BASE_URL`, `TEST_EMAIL`, and `TEST_PASSWORD`. It is not runnable locally without a live, authenticated kids-stories instance.
- **Git hooks:** run `git config core.hooksPath .githooks` once; the pre-push hook blocks direct pushes to `main`.
