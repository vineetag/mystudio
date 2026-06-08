# ZippyTales — Context

## What this app does
ZippyTales generates personalized bedtime stories for children ages 3–9. A parent enters their child's name, picks a theme (adventure, animals, space, or fantasy), and receives a wholesome 250–450-word story in seconds. Stories are saved to a per-user library. The app is built as part of the AppCrafter Studio monorepo at appcrafter.studio.

## Tech stack
- Frontend: Next.js 15 (App Router), Tailwind CSS, shadcn/ui, ZippyTales custom design tokens
- Backend: Supabase (Postgres + Auth + RLS), Next.js API routes / Server Actions
- AI: Claude claude-haiku-4-5 via Anthropic SDK (`lib/ai.ts`) — server-side only
- Deployment: Vercel
- Analytics: PostHog (`lib/analytics.ts`)
- Package manager: pnpm (Turborepo monorepo)

## Folder structure
```
app/                → Next.js App Router pages
  page.tsx          → Homepage (StoryGenerator)
  library/          → Saved stories (auth-gated)
  story/[id]/       → Single story view
  admin/            → Admin dashboard (admin-email-gated)
  auth/             → Supabase auth pages
  privacy/
  disclaimer/
  release-notes/
modules/
  kids-stories/     → Story domain: StoryGenerator, ThemePicker, StoryCard, themes
  auth/             → Auth helpers exposed via index.ts
lib/
  ai.ts             → Story generation, rate limiting, spend cap, error types
  db.ts             → Supabase SSR client + service-role client
  analytics.ts      → PostHog wrapper
  supabase-browser.ts / supabase-middleware.ts
supabase/
  migrations/       → Versioned SQL migrations (see below)
```

## Database schema (migrations)
- `0001_init.sql` — `profiles`, `stories`, `generation_log` tables; RLS policies
- `0002_profile_trigger.sql` — auto-create profile on auth.users insert
- `0003_ai_usage.sql` — `ai_usage` ledger + `ai_spend_this_month()` RPC
- `0004_generation_slot.sql` — `claim_generation_slot()` / `release_generation_slot()` RPCs (atomic daily-limit enforcement)

## Key decisions made
- **Model:** claude-haiku-4-5 — cheapest model adequate for short kids' stories; does NOT support `effort`/thinking. Swap to Sonnet/Opus if richer output is needed and update `PRICING` in `lib/ai.ts`.
- **Rate limiting:** Per-user daily cap (env: `DAILY_STORY_LIMIT`, default 5) enforced atomically via `claim_generation_slot` RPC to prevent race conditions.
- **Spend cap:** Hard monthly USD ceiling (env: `ANTHROPIC_MONTHLY_BUDGET_USD`, default $20) checked before any generation via `ai_spend_this_month()` RPC.
- **Prompt caching:** System prompt uses `cache_control: ephemeral` to reduce costs across generations.
- **Stories as JSONB:** Story output (title, content, illustration emoji) returned as structured JSON via Anthropic's `json_schema` output format; stored as columns in `stories` table.
- **Admin gate:** `/admin` is 404 for non-admins (not 403) to avoid revealing the route. Email allowlist in `ADMIN_EMAILS` env var.
- **RLS:** All user data is protected by Row Level Security. Service client used only in trusted server contexts (admin route, system inserts).

## Current state
MVP complete (feat/zippytales-mvp merged to main). All core flows working:
- Story generation with rate limiting and spend cap
- Story library (auth-gated)
- Single story view
- Admin dashboard (usage, spend, theme breakdown, recent stories)
- Auth (Supabase email + OAuth)
- Standard pages: privacy, disclaimer, release notes

## What NOT to change
- Auth flow is finalized — do not modify `/app/auth` or `lib/db.ts` client setup
- DB schema is locked — run versioned SQL migrations for any changes, never edit Supabase dashboard directly
- `THEMES` in `lib/ai.ts` and `THEME_OPTIONS` in `modules/kids-stories/themes.ts` must stay in sync with the DB `theme` check constraint and Tailwind theme tokens
- All AI calls must go through `lib/ai.ts` — never call Anthropic SDK directly from components or pages
