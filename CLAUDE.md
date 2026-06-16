# AppCrafter Studio — Monorepo Conventions
My studio name is AppCrafter.
Domain is - appcrafter.studio

## How to work in this codebase
- Always think step by step before writing code
- Prefer simple, readable code over clever code
- When something can be done multiple ways, recommend the best approach and explain why briefly
- If a prompt is ambiguous, ask one clarifying question before proceeding
- Proactively flag any security, cost, or compliance risks
- When providing multiple options, mark the recommended one with a rationale

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
│   ├── web/            # portfolio hub site (appcrafter.studio)
│   ├── kids-stories/   # kids story generator
│   ├── math-workbook/  # math practice app
│   └── wealth/         # wealth tracker
├── packages/
│   ├── ui/             # shared design system — shadcn components + brand tokens
│   ├── config/         # shared eslint, typescript, tailwind config
│   └── analytics/      # PostHog wrapper and standard event taxonomy

## Git workflow
- Never commit or push directly to `main` — it auto-deploys to production
- All work goes on a feature branch: `git checkout -b feat/<name>`
- Push the branch to get a Vercel preview URL, test there first
- Merge to `main` only via a PR once the preview is confirmed good
- Commits must use conventional format: `feat:`, `fix:`, `chore:`, `docs:`
- A pre-push hook (`.githooks/pre-push`) enforces branch rules locally
- After a fresh clone, run: `git config core.hooksPath .githooks`

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

## Design & UX principles
- **Responsive first**: every UI must work across all screen sizes — mobile, tablet, desktop. No layout breaks at any breakpoint.
- **Clear error messages**: validation errors and backend failures must tell the user exactly what went wrong and how to fix it. Never show generic "Something went wrong" — surface the real reason.
- **Mobile touch targets**: interactive elements (buttons, links, inputs) must have a minimum 48×48px tap area with proper safe-area margins on mobile.
- **No request waterfalls**: fetch parallel data concurrently. Show CSS skeleton loaders immediately during async states — no blank screens or spinners that block layout.
- **Minimal motion**: use hardware-accelerated CSS keyframe animations only (transform, opacity). No heavy animation libraries. Stagger entrance animations via CSS, not JS orchestration.
