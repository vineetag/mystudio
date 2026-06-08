# AppCrafter Web (Portfolio Hub) — Context

## What this app does
The AppCrafter web app is the public portfolio hub at appcrafter.studio. It showcases all apps built under the AppCrafter Studio umbrella (ZippyTales, Math Workbook, Wealth Tracker, and future apps) and serves as the brand's landing page.

## Tech stack
- Frontend: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- Backend: Supabase (Postgres + Auth + RLS) — minimal; mostly a static/SSG site
- Deployment: Vercel (root of monorepo deployment target)
- Analytics: PostHog (`lib/analytics.ts`)
- Package manager: pnpm (Turborepo monorepo)

## Folder structure
```
app/                → Next.js App Router pages
  page.tsx          → Homepage — app directory / portfolio grid
  admin/            → Admin dashboard (stub)
  privacy/
  disclaimer/
  release-notes/
lib/
  db.ts             → Supabase SSR client (minimal use on this app)
  analytics.ts      → PostHog wrapper
```

## Key decisions made
- Portfolio hub is mostly static/SSG — no AI calls, minimal DB usage
- Each app card links out to its own subdomain/deployment (links are `#` placeholders until apps are live)

## Current state
Pre-development scaffold. Homepage has a hardcoded app grid with three cards (still using old "Tiny Tales" name instead of ZippyTales, and "Slate Studio" brand instead of AppCrafter). Needs a branding update and real links once apps are deployed.

## What NOT to change
- This app has a `vercel.json` at `apps/web/vercel.json` (scoped per-app after the monorepo Vercel fix in commit 583ec0f). Do not move or add a root-level `vercel.json`.

## Known issues / tech debt
- Homepage still references old brand name "Slate Studio" and app name "Tiny Tales" — needs updating to AppCrafter and ZippyTales
- App card hrefs are all `#` placeholders — need real URLs once apps are deployed
