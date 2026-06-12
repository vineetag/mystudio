# AppCrafter Studio

**A product builder's monorepo. Real apps for real problems — mostly mine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2015-black)](https://nextjs.org)
[![Powered by Claude](https://img.shields.io/badge/AI-Claude%20(Anthropic)-blueviolet)](https://anthropic.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

**[appcrafter.studio](https://appcrafter.studio)** · **[ZippyTales →](https://zippytales.app)**

---

## What is this?

This is my personal app studio — a monorepo that houses the apps I build to solve problems in my own life. It's a working, production-grade codebase built with a modern full-stack setup: Next.js, Supabase, Tailwind, Claude AI, and a bunch of tooling that makes it easier to ship fast and keep things clean.

I'm making it public because I think there are people out there who'd find this useful — either as a reference, as a starting point for their own ideas, or just to see how someone goes from "I wish this existed" to actually having it live on the internet.

---

## The story behind it

I've spent 15+ years building products — B2B, B2C, everything in between. I know how to take an idea from concept to launch. But for most of that career, I needed a team to actually build the thing.

That changed with AI.

I'm also a dad of two. And like a lot of parents, I kept running into small, specific problems that existing apps didn't quite solve. Nothing groundbreaking — just "I wish there was an app that did *this*." With AI, I can actually go from that thought to a working prototype in days, not months. So I started building.

This studio is that — a collection of apps solving real problems from my real life. Some of them might be useful for you too. Some might just spark an idea. Either way, the code is here, the patterns are documented, and you're welcome to run with it.

---

## The apps

### [ZippyTales](https://zippytales.app) — *Live* ✅

AI-powered bedtime story generator for kids.

My kids would always have very specific story requests: "A dragon who's scared of butterflies," or "A story about a princess who loves math." Running out of books was one thing. Running out of *ideas* that matched what they actually wanted was another.

ZippyTales generates personalized, age-appropriate bedtime stories based on themes your kid picks. You can choose a moral theme (kindness, courage, honesty, etc.), pick an age range, and the app generates a short, read-aloud-friendly story in seconds. Stories are saved so you can come back to favorites.

**What's built:** Story generation with per-user daily limits and a hard monthly AI spend cap, theme picker, age picker, story library, authentication, print-friendly layout, admin dashboard.

---

### Math Workbook — *Coming soon* 🚧

Gamified math practice for kids.

My son is heading into first grade with a summer full of free time. I wanted something that would keep his brain engaged — not boring worksheets, but something that actually feels like a game. Math Workbook will generate personalized practice problems, track progress, and make getting the right answer feel like an achievement.

---

### Wealth Tracker — *Coming soon* 🚧

A consolidated view of all your investment accounts.

Between 401(k)s, Roth IRAs, brokerage accounts, and whatever else accumulates over a career, it gets genuinely hard to know where you stand. The apps that solve this are expensive. I wanted to build my own — something that gives me a clean, AI-powered view of everything I own, how diversified I am, and what moves might make sense. No subscription. Just mine.

---

### [AppCrafter.studio](https://appcrafter.studio) — *Live* ✅

The portfolio hub that links everything together. Still pretty minimal, but it's the front door.

---

## Tech stack

Here's everything that goes into building and running these apps:

| Layer | Tech | Why |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org) (App Router) | Full-stack React, SSR, API routes — everything in one place |
| **Language** | TypeScript | Catch mistakes before they ship |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) | Fast to build, easy to customize |
| **Database + Auth** | [Supabase](https://supabase.com) | PostgreSQL + Auth + Storage as a service. Row-level security baked in. |
| **AI** | [Anthropic Claude](https://anthropic.com) (via API) | Currently using Claude Haiku 4.5 — it's fast, cheap, and more than good enough for these use cases |
| **Analytics** | [PostHog](https://posthog.com) | Product analytics, session replay, feature flags |
| **Payments** | [Stripe](https://stripe.com) | Wired up in Wealth (coming soon) |
| **Testing** | [Playwright](https://playwright.dev) | E2E tests that run on every PR against the Vercel preview |
| **Monorepo** | [Turborepo](https://turbo.build) | Manages the multiple apps and shared packages together |
| **Package manager** | [pnpm](https://pnpm.io) | Faster and more disk-efficient than npm/yarn |
| **Hosting** | [Vercel](https://vercel.com) | Every push to a feature branch gets its own preview URL |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) | Runs E2E tests and secret scanning on every PR |

---

## How the repo is organized

```
mystudio/
├── apps/
│   ├── web/              # appcrafter.studio — portfolio hub
│   ├── kids-stories/     # ZippyTales — bedtime story generator
│   ├── math-workbook/    # Math practice app (coming soon)
│   └── wealth/           # Wealth tracker (coming soon)
├── packages/
│   ├── ui/               # Shared design system — shadcn components + brand tokens
│   ├── config/           # Shared ESLint, TypeScript, and Tailwind configs
│   └── analytics/        # PostHog wrapper and standard event taxonomy
├── e2e/                  # Playwright E2E tests
├── .claude/              # Claude Code hooks and custom skills (see below)
├── .github/workflows/    # CI/CD pipelines
├── .githooks/            # Git hooks (blocks direct pushes to main)
└── turbo.json            # Turborepo build pipeline config
```

Each app follows the same internal structure:

```
apps/<app-name>/
├── app/          # Next.js pages, layouts, and API routes
├── modules/      # Domain logic — one folder per domain (auth, [app-domain])
├── lib/          # Shared utilities: db.ts, ai.ts, analytics.ts
├── components/   # UI components
└── supabase/
    └── migrations/  # Versioned SQL migrations (never edit the DB manually)
```

### A few hard rules baked into the architecture

- **AI calls are server-side only.** No API keys in the browser. Ever.
- **Every AI call goes through `lib/ai.ts`.** It enforces per-user rate limits and a hard monthly spend cap. You won't accidentally rack up a huge bill.
- **Database changes go through SQL migration files.** No manual edits in the Supabase dashboard.
- **Direct pushes to `main` are blocked** by a pre-push git hook. All changes go through feature branches and PRs.

---

## The CI/CD pipeline (end to end)

Here's what happens when you push code:

1. **Push a branch** → Vercel automatically builds and deploys a preview URL for that branch
2. **Open a PR** → GitHub Actions kicks off two things:
   - **Secret scanner** ([Gitleaks](https://gitleaks.io)) — checks for accidentally committed API keys or credentials
   - **E2E test suite** — waits for the Vercel preview to be ready, then runs Playwright tests against it
3. **Tests pass** → PR can be merged to `main`
4. **Merge to `main`** → Vercel auto-deploys to production

No manual deploys. No "works on my machine." If the preview passes E2E, it ships.

---

## Custom Claude Code agents & skills

I use [Claude Code](https://claude.ai/code) as my AI coding assistant, and I've built a few custom automations on top of it that live in the `.claude/` folder. If you use Claude Code too, these will just work.

### Hooks

**`.claude/hooks/post-commit-dev.sh`**
After every `git commit`, this hook auto-starts the dev server for the app you're working in (if one isn't already running) and opens it in your browser. Small thing, but it removes friction from the feedback loop.

**`.claude/hooks/post-push-check.sh`**
After a `git push`, this checks the E2E test status on the open PR — shows you whether tests are passing, failing, or still running, and prints the Vercel preview URL.

### Skills

**`.claude/skills/ui-ux-pro-max/`**
A custom UI/UX skill that gives Claude design intelligence — 67 styles, 96 palettes, 57 font pairings, and support for 13 frontend stacks. Invoke it with `/ui-ux-pro-max` in a Claude Code session.

---

## Using this repo

### Option 1 — Fork it and build your own app

This is the main thing the repo is set up for. Fork it, pick an existing app as a template, and replace the domain logic with your own idea. The scaffolding (auth, admin, release notes, privacy, database setup, AI rate limiting) is already there.

A few things you'll need to update after forking:
- Replace `NEXT_PUBLIC_SITE_URL` in each app's `.env`
- Create your own Supabase project and run the migration files
- Set your own `ADMIN_EMAILS` env var (controls access to `/admin`)
- Update the app name and domain references in `app/layout.tsx` and `package.json`

### Option 2 — Bring your own Anthropic API key

The AI integration is already structured to be swappable. To use your own Anthropic account:

1. Create an account at [anthropic.com](https://anthropic.com) and grab an API key
2. Add it to your `.env` file: `ANTHROPIC_API_KEY=your-key-here`
3. Set your own budget: `ANTHROPIC_MONTHLY_BUDGET_USD=20` (hard monthly cap — change this to whatever you're comfortable with)
4. Set your daily per-user limit: `DAILY_STORY_LIMIT=5`

All AI calls go through `lib/ai.ts` in each app. That's the single place to change model, limits, or provider if you want to swap to something else down the line.

### Option 3 — Use the shared packages

The three packages in `/packages` are designed to be reusable:

- **`@studio/ui`** — The component library and design system. Drop it into any Next.js app.
- **`@studio/config`** — Shared ESLint, TypeScript, and Tailwind configs. Consistent defaults across apps.
- **`@studio/analytics`** — The PostHog wrapper with a standard event taxonomy. Swap PostHog for something else in one place.

---

## Getting started

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 9 (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) account (free tier works)
- An [Anthropic](https://anthropic.com) API key

### Setup

```bash
# Clone the repo
git clone https://github.com/vineetag/mystudio.git
cd mystudio

# Wire up git hooks (blocks accidental pushes to main)
git config core.hooksPath .githooks

# Install dependencies
pnpm install
```

### Run an app locally

Each app runs on its own port. Let's use `kids-stories` as an example:

```bash
# 1. Set up environment variables
cp apps/kids-stories/.env.example apps/kids-stories/.env.local
# Fill in your Supabase URL, keys, and Anthropic API key

# 2. Set up the database
# In your Supabase project, run the SQL files in order:
# apps/kids-stories/supabase/migrations/0001_init.sql
# apps/kids-stories/supabase/migrations/0002_profile_trigger.sql
# apps/kids-stories/supabase/migrations/0003_ai_usage.sql
# apps/kids-stories/supabase/migrations/0004_generation_slot.sql
# apps/kids-stories/supabase/migrations/0005_theme_array.sql

# 3. Start the dev server
pnpm --filter kids-stories dev
# App is at http://localhost:3001
```

Other apps follow the same pattern (`pnpm --filter math-workbook dev` → port 3002, `pnpm --filter wealth dev` → port 3003).

---

## Contributing

All of it is welcome. Here's what I'm most interested in:

**Bug reports and feedback** — If something's broken or confusing, open an issue. Be specific about what you were trying to do and what happened.

**New apps** — The most interesting contribution would be building a new app on this scaffold and showing what you made. Open an issue first to describe the idea — I'd love to hear what problems people are trying to solve.

**Core infrastructure** — PRs to improve the shared packages, CI pipeline, or architecture are welcome. Keep changes focused — a PR that touches 10 files in 4 apps is a hard review.

**Show and tell** — If you fork this and build something, I want to see it. Open an issue with the "show and tell" label or tag me. I'll add a link to your project here.

### Before you open a PR

- Create a feature branch: `git checkout -b feat/your-thing`
- Keep it focused — one thing per PR
- If you're changing architecture or shared packages, open an issue first to discuss

---

## Giving credit

If you use this repo as a starting point for something you build, a link back to [appcrafter.studio](https://appcrafter.studio) or this repo in your README would be genuinely appreciated. Nothing formal — just a hat tip.

If you build something cool on top of this, I'd honestly just love to know about it.

GitHub: [@vineetag](https://github.com/vineetag)

---

## License

MIT — do whatever you want with it. Build your own apps, fork the patterns, remix the architecture. Just don't hold me liable if something breaks in production. See [LICENSE](./LICENSE) for the full text.

---

*Built by a product person who got tired of waiting for someone else to build the apps they needed.*
