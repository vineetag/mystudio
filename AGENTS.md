# AGENTS.md

See `CLAUDE.md` for architecture/conventions and `README.md` for setup, run commands, and a **Troubleshooting** section (DB-password encoding, `psql`, and the Node version needed for the `/agents` CLIs). This file only adds notes specific to running in Cursor Cloud.

## Cursor Cloud specific instructions

- **Secrets don't arrive via `.env` files.** Gitignored `.env`/`.env.local` files are not in the repo, so a Cloud Agent VM (fresh clone) never receives them. Add secrets in the Cursor **Secrets panel**; they're injected as environment variables. To run `kids-stories`, mirror the injected vars into `apps/kids-stories/.env.local` (Next.js loads `.env.local`, and `@next/env` won't override real env vars; the migration scripts read `.env.local` too). Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`.

- **`node` on the VM may be too old for the `/agents` CLIs.** If the default `node` predates 22.18 (type stripping), `pnpm agents:rules` / `pnpm agents:cost` fail with `ERR_UNKNOWN_FILE_EXTENSION`. Use an nvm-installed Node ≥ 22.18 (e.g. `~/.nvm/versions/node/*/bin/node agents/rules-enforcer/src/cli.ts --root .`) or pass `--experimental-strip-types`. Lint/typecheck/build/dev work on the default node.

- **Which apps run without secrets:** `web` (3000) is fully functional (its contact form logs instead of sending when `RESEND_API_KEY` is unset in dev). `math-workbook` (3002) and `wealth` (3003) boot as coming-soon placeholders. `kids-stories` (3001) needs the secrets above.
