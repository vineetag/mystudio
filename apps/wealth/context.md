# Wealth Tracker — Context

## What this app does
Wealth Tracker helps individuals track their financial journey simply — net worth, accounts, assets, and liabilities in one place. Part of the AppCrafter Studio monorepo at appcrafter.studio.

## Tech stack
- Frontend: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- Backend: Supabase (Postgres + Auth + RLS), Next.js API routes / Server Actions
- AI: Claude API via `lib/ai.ts` — server-side only (model TBD at build time)
- Deployment: Vercel
- Analytics: PostHog (`lib/analytics.ts`)
- Package manager: pnpm (Turborepo monorepo)

## Folder structure
```
app/                → Next.js App Router pages
  page.tsx          → Homepage (placeholder — "Coming soon")
  admin/            → Admin dashboard (stub)
  privacy/
  disclaimer/
  release-notes/
lib/
  ai.ts             → AI client (stub — to be built out)
  db.ts             → Supabase SSR client + service-role client
  analytics.ts      → PostHog wrapper
```

## Key decisions made
- None finalized yet — app is pre-development scaffolding only

## Current state
Pre-development. Scaffold only — homepage shows "Coming soon." No modules, no DB schema, no AI integration. Standard pages (privacy, disclaimer, release-notes, admin) are stubbed.

## What NOT to change
- Follow monorepo hard rules: all AI calls server-side via `lib/ai.ts`, DB changes via versioned SQL migrations, never reach across module boundaries
- Financial data is sensitive — RLS must be enforced on all user data tables from day one
