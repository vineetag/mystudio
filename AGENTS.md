# AGENTS.md

See `CLAUDE.md` and `README.md` for the full architecture, stack, and contribution rules. This file adds environment-specific operating notes.

## Cursor Cloud specific instructions

### What this repo is
A Turborepo monorepo of 4 Next.js 15 apps + shared packages (`packages/ui`, `packages/config`, `packages/analytics`) and two zero-dependency TS CLI agents (`agents/rules-enforcer`, `agents/ai-cost-guard`). Standard commands live in the root `package.json` and per-app `package.json`; use those instead of inventing new ones (`pnpm dev|lint|typecheck|build`, `pnpm --filter @studio/<app> dev`, `pnpm agents:rules`, `pnpm agents:cost`, `pnpm test:e2e`).

### Apps and dev ports
| App | Package | Dev port | Runs without secrets? |
|---|---|---|---|
| web (portfolio hub) | `@studio/web` | 3000 | Yes — fully functional |
| kids-stories (ZippyTales) | `@studio/kids-stories` | 3001 | No — needs Supabase + Anthropic (see below) |
| math-workbook | `@studio/math-workbook` | 3002 | Yes (coming-soon placeholder) |
| wealth | `@studio/wealth` | 3003 | Yes (coming-soon placeholder) |

Run one app with e.g. `pnpm --filter @studio/web dev`. Each app reads `apps/<app>/.env.local` (gitignored; copy from `apps/<app>/.env.example`).

### Secrets on Cloud Agent VMs
Gitignored `.env`/`.env.local` files do NOT reach a Cloud Agent VM (the repo is cloned fresh from GitHub). Provide secrets via the Cursor **Secrets panel**; they are injected as environment variables into the VM. To run `kids-stories`, mirror the injected vars into `apps/kids-stories/.env.local` (Next.js loads `.env.local`, and `@next/env` won't override real env vars; the migration scripts also read `.env.local`). Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`.

### Non-obvious gotchas
- **Agent CLIs need a newer Node than the VM default.** `pnpm agents:rules` / `pnpm agents:cost` execute TypeScript directly via `node agents/.../cli.ts`. The VM's default `node` (`/exec-daemon/node`, v22.14.0) cannot strip TS types and fails with `ERR_UNKNOWN_FILE_EXTENSION`. Use the nvm Node that ships on the VM, e.g. `~/.nvm/versions/node/v22.22.2/bin/node agents/rules-enforcer/src/cli.ts --root .`, or pass `--experimental-strip-types`. CI uses Node 24. (Lint/typecheck/build/dev all work fine on the default node.)
- **`kids-stories` returns HTTP 500 without Supabase env.** Its `middleware.ts` calls `createServerClient` on every request, which throws when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are empty. With the secrets above populated in `apps/kids-stories/.env.local`, it boots and story generation works end-to-end (anonymous Supabase sign-in + Anthropic). Without the secrets, demo the `web` app instead.
- **DB migrations + the `DATABASE_URL` password quirk.** Migrations live in `apps/kids-stories/supabase/migrations` and apply to the remote Supabase Postgres (they persist server-side, so this is a one-time step; the shared dev DB is already migrated). `psql` is required but is NOT preinstalled (`sudo apt-get install -y postgresql-client`). The Supabase pooler `DATABASE_URL` password contains un-encoded special chars (`@ ? $ ! /`), which breaks both `scripts/setup-db.sh` (it `source`s the env file → `unbound variable`) and the URI parser in `apps/kids-stories/scripts/run-migrations.mjs` (`ERR_INVALID_URL`). Workaround: split the URL and run `psql` with `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE/PGSSLMODE=require` env vars (no encoding needed), or percent-encode the password.
- **Story-safety screen blocks every story by default (pre-existing app bug).** `modules/safety` sends a JSON schema with `integer` `minimum`/`maximum`, which the current Anthropic API rejects with a 400; screening then fails closed (`unsafe_content`, HTTP 422) for even wholesome stories. The underlying story generation is fine. For dev, set `STORY_SAFETY_FAIL_MODE=open` (allow on screener error) or `STORY_SAFETY_ENABLED=false` in `apps/kids-stories/.env.local` to exercise the core flow. This is an app-code issue, not an env issue.
- **`web` contact form works with no secrets in dev.** When `RESEND_API_KEY` is unset and `NODE_ENV !== production`, `lib/email.ts` logs the submission and returns success, so the form completes end-to-end locally.
- **E2E (`pnpm test:e2e`)** runs Playwright against a deployed preview, not a local server: it needs `pnpm exec playwright install chromium`, plus `BASE_URL`, `TEST_EMAIL`, and `TEST_PASSWORD`. It is not runnable locally without a live, authenticated kids-stories instance.
- **Git hooks:** run `git config core.hooksPath .githooks` once; the pre-push hook blocks direct pushes to `main`.
