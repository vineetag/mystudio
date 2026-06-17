# AppCrafter Studio

**A product builder's monorepo. Real apps for real problems — mostly mine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
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
├── agents/               # Open-source dev-workflow agents (rules-enforcer, ai-cost-guard)
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
2. **Push or open a PR** → GitHub Actions runs the quality gates:
   - **Rules enforcer** — enforces the architectural hard rules (see [Agents](#agents--automated-quality-gates) below)
   - **AI cost guard** — verifies AI spend stays centralized and capped
   - **Secret scanner** ([Gitleaks](https://gitleaks.io)) — checks for accidentally committed API keys or credentials
   - **E2E test suite** — waits for the Vercel preview to be ready, then runs Playwright tests against it
3. **Gates pass** → PR can be merged to `main`
4. **Merge to `main`** → Vercel auto-deploys to production

No manual deploys. No "works on my machine." If the preview passes E2E, it ships.

---

## Agents — automated quality gates

A monorepo has architectural rules that are easy to break silently in a PR and
painful to fix later. So I built a small suite of **agents** that enforce them
automatically. They come in two tiers.

### Dev-workflow agents (`/agents`)

Generic, cross-app agents that keep the whole repo healthy. Each is a
self-contained, **zero-dependency** TypeScript CLI (open-source, scoped
`@appcrafter/*`, publishable to npm on its own).

| Agent | What it enforces |
|---|---|
| **[`rules-enforcer`](./agents/rules-enforcer)** | The architectural hard rules: no client-side AI/Supabase calls, no hardcoded secrets, no cross-module imports (must go through `index.ts`), every app has its required pages (overview, release-notes, privacy, disclaimer, admin), and DB changes use versioned SQL migrations. |
| **[`ai-cost-guard`](./agents/ai-cost-guard)** | AI spend safety: every AI call routes through the single audited `lib/ai.ts`, which must enforce a per-user rate limit, a hard monthly spend cap, and a system prompt on every model call. |

These are **deterministic** on purpose — the rules are machine-checkable, so a
plain static check is free, instant, reproducible, and needs no API key. (Fuzzy
judgment is reserved for LLM agents — see the next tier.)

**Run them locally:**

```bash
pnpm agents:rules     # rules-enforcer
pnpm agents:cost      # ai-cost-guard
```

They run from TypeScript source directly (Node ≥ 20), exit non-zero on
violations, and support `--json`, `--strict`, `--app <name>`, and `--rule <name>`.
Configure via `rules-enforcer.config.json` / `ai-cost-guard.config.json` at the
repo root.

### App-level agents (`apps/<app>/modules/...`)

Runtime AI features specific to one app. They encode product logic, so they ship
with the app rather than the open-source `/agents` folder.

| Agent | App | What it does |
|---|---|---|
| **[`story-safety`](./apps/kids-stories/modules/safety)** | ZippyTales | An LLM screener that checks every generated story for age-appropriateness *before* it reaches a child — defense in depth on top of the strict generation prompt. Routes through `lib/ai`, so it inherits the same spend cap. |

### How they're triggered

| Layer | How |
|---|---|
| **CI** | `.github/workflows/rules-enforcer.yml` and `ai-cost-guard.yml` run on every push and PR; a violation blocks merge. |
| **CLI / pnpm** | `pnpm agents:rules`, `pnpm agents:cost`. |
| **Claude Code** | Each dev agent ships a wrapper in `.claude/agents/` — invoke `@rules-enforcer` / `@ai-cost-guard` in a session and it runs the CLI and explains the findings. |
| **Runtime** | App-level agents (like `story-safety`) run inside the request flow automatically. |

See [`agents/README.md`](./agents/README.md) for the full catalog and conventions
for adding new agents.

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

> **Nothing in this repo is tied to my accounts.** Every service — Supabase, Vercel, Anthropic, PostHog — is wired up through environment variables. When you fork this, you bring your own credentials and your own infrastructure. Your data stays in your accounts, your AI spend goes to your API key, and your deployments go to your Vercel. I have zero visibility into what you build or run.

### Option 1 — Fork it and build your own app

This is the main thing the repo is set up for. Fork it, pick an existing app as a template, and replace the domain logic with your own idea. The scaffolding (auth, admin, release notes, privacy, database setup, AI rate limiting) is already there.

A few things you'll need to update after forking:
- Replace `NEXT_PUBLIC_SITE_URL` in each app's `.env`
- Create your own Supabase project and run the migration files
- Set `ADMIN_EMAILS` to your own email — this is the only thing that gates the `/admin` dashboard (non-admins get a 404, not a 403, so the route doesn't advertise its existence)
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
# Add DATABASE_URL to your .env.local first:
# Get it from Supabase Dashboard → Settings → Database → Connection string (URI)
# Then run:
./scripts/setup-db.sh kids-stories
# The script is idempotent — safe to re-run, skips already-applied migrations.

# 3. Start the dev server
pnpm --filter kids-stories dev
# App is at http://localhost:3001
```

Other apps follow the same pattern (`pnpm --filter math-workbook dev` → port 3002, `pnpm --filter wealth dev` → port 3003).

---

## Contributing

All of it is welcome. Here's what I'm most interested in:

**Bug reports, feedback, and feature requests** — Found a bug in the app or the code? Got an idea for a feature? [Open a GitHub issue](https://github.com/vineetag/mystudio/issues/new) and describe what you were trying to do and what happened (or what you wish existed). That's the best place to track it.

**New apps** — The most interesting contribution would be building a new app on this scaffold and showing what you made. Open an issue first to describe the idea — I'd love to hear what problems people are trying to solve. And honestly, if you've got an idea you want to build together, I'm genuinely open to that too — reach out and let's talk.

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

MIT — do whatever you want with it. Build your own apps, fork the patterns, remix the architecture, use it commercially. Just don't hold me liable if something breaks in production. See [LICENSE](./LICENSE) for the full text.

---

*Built by a product person who got tired of waiting for someone else to build the apps they needed.*
