# AppCrafter Studio — Monorepo Conventions
My studio name is now AppCrafter.
Domain is - appcrafter.studio

## Stack
- Framework: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- Database + Auth + Storage: Supabase
- Payments: Stripe
- Analytics: PostHog
- Error tracking: Sentry
- Package manager: pnpm
- Monorepo: Turborepo

## Folder structure
studio/
├── apps/
│   ├── web/            # portfolio hub site (slatestudio.co)
│   ├── kids-stories/   # kids story generator
│   ├── math-workbook/  # math practice app
│   └── wealth/         # wealth tracker
├── packages/
│   ├── ui/             # shared design system — shadcn components + brand tokens
│   ├── config/         # shared eslint, typescript, tailwind config
│   └── analytics/      # PostHog wrapper and standard event taxonomy

## Hard rules — never break these
- Secrets and API keys go in .env files only, never in code
- All Supabase and AI API calls are server-side only (API routes or Server Actions)
- Never reach across module boundaries directly — go through the module's index.ts
- Every new app must include: overview page, release notes page, privacy page,
  disclaimer page, and a /admin dashboard route
- Database changes go through versioned SQL migration files, never manual edits
  in the Supabase dashboard

## Naming conventions
- Files: kebab-case
- Components: PascalCase
- Functions and variables: camelCase
- Database tables: snake_case
- Environment variables: SCREAMING_SNAKE_CASE

## Architecture pattern
Modular monolith per app. Each app is internally split into modules:
- app/ — Next.js pages and API routes
- modules/ — one folder per domain (auth, billing, [app-domain])
- lib/ — shared utilities (db.ts, ai.ts, analytics.ts)
- components/ — UI components, importing from packages/ui

## AI usage
- All AI calls go through lib/ai.ts — never call Anthropic/Gemini API directly
  from components or pages
- lib/ai.ts must enforce per-user rate limits and a hard monthly spend cap
- Always include a system prompt — never send raw user input to a model