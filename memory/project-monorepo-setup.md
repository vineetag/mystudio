---
name: project-monorepo-setup
description: Slate Studio monorepo structure — apps, packages, ports, key conventions
metadata:
  type: project
---

Turborepo monorepo scaffolded at `/Users/vineetag/Claude/mystudio/`.

**Why:** Solo founder building a portfolio of apps under the Slate Studio brand. Single repo keeps packages/config shared.

**Structure:**
- `apps/web` (port 3000) — portfolio hub `slatestudio.co`
- `apps/kids-stories` (port 3001) — Tiny Tales story generator
- `apps/math-workbook` (port 3002) — Math practice app
- `apps/wealth` (port 3003) — Wealth Tracker
- `packages/ui` — `@studio/ui`: shared shadcn components + cn util
- `packages/config` — `@studio/config`: TypeScript + ESLint base configs
- `packages/analytics` — `@studio/analytics`: PostHog wrapper, event taxonomy

**Each app has:**
- Required routes: `/`, `/release-notes`, `/privacy`, `/disclaimer`, `/admin`
- `lib/ai.ts` — Anthropic SDK wrapper (rate limit enforcement TODO)
- `lib/db.ts` — Supabase client (browser + service)
- `lib/analytics.ts` — re-exports from `@studio/analytics`
- `components.json` — shadcn/ui config (base color: slate)

**How to apply:** When adding new routes or features, follow the existing modular pattern. `lib/ai.ts` is the only place AI calls can be made. shadcn components added via `npx shadcn@latest add <component>` from the app directory.
