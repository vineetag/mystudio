# OneFolio — Personal Multi-Account Portfolio Tracker

**Status:** Draft v1 · **Owner:** Vineet · **Name:** OneFolio (onefolio.app, verify availability; may change) · **Home:** AppCrafter Studio monorepo, `apps/wealth` (mystudio Supabase, new Vercel project)

---

## Problem Statement

Vineet self-manages a portfolio spread across 10+ brokerage accounts (taxable, 401k, Roth IRA, BrokerageLink) with no consolidated view. Without one, it's impossible to answer basic questions: total exposure to a single ticker, overall diversification, concentration risk, or how the portfolio performs against benchmarks. Existing tools either cost money, sell data, or don't handle the 401k/BrokerageLink mix.

## Goals

1. One dashboard showing every holding across every account, with per-account and consolidated rollups
2. Answer "am I over-concentrated?" in under 10 seconds via visual analysis
3. Track portfolio performance vs S&P 500 and Nasdaq over time
4. AI-powered analysis per stock and portfolio-wide, within a hard monthly spend cap
5. Ship open source with a fully functional demo mode, zero-config for visitors

## Non-Goals

- **Trading / order execution.** Read-only by design. Removes the scariest security surface.
- **Transaction history storage.** Positions and cost basis only (see Guardrails).
- **Multi-user SaaS.** One live user (Vineet). Everyone else gets demo mode. Auth stays simple.
- **Real-time streaming prices.** Refresh on page load only. Free API tier, no websockets.
- **Bank/cash account aggregation.** Brokerage investment accounts only.

## Key Decisions (resolved during spec review)

| Decision | Choice | Rationale |
|---|---|---|
| Aggregation platform | **SnapTrade** (Phase 2) + manual/CSV always available | Free tier: 5 connections read-only; ~$1.50/connected user/mo after. Covers Robinhood, Fidelity, Schwab, E*Trade. Built for retail brokerage, unlike Plaid |
| 401k / BrokerageLink | **Manual entry + CSV import** | Aggregator coverage for employer plans is unreliable. Manual is the P0 path, not a fallback |
| Price data | **Finnhub free tier** (60 calls/min), quotes cached in Supabase, refreshed on page load if cache > 15 min old | Refresh-on-load requirement makes free tier ample. Cache table absorbs rate limits |
| Data residency | **mystudio Supabase**, all tables prefixed `pt_` | Prefix = clean future migration to a dedicated project via schema dump |
| Guardrail (revised) | Never store brokerage **credentials** or **transaction history**. Store positions, cost basis, and daily value snapshots only | Original "store nothing" wording would break avg cost and period-over-period change |
| Historical performance | Daily snapshot row (Vercel cron + upsert on load) | Needed for D/D, W/W, M/M and benchmark comparison |
| AI analysis | Claude API (Haiku default, Sonnet opt-in), pre-call cost estimate, monthly budget table with hard warn | Req 18 |

## User Stories

**Owner (live mode)**
- As the owner, I want to see every account with its holdings (qty, avg cost, current price, total value, gain/loss $ and %) so I can review each account independently
- As the owner, I want a consolidated per-ticker view (e.g., GOOG across 6 accounts) expandable into the per-account breakdown so I can see total exposure at a glance
- As the owner, I want total portfolio value, S&P 500, and Nasdaq widgets on the dashboard so I get market context immediately
- As the owner, I want to add/edit holdings manually or via CSV so my 401k accounts are first-class citizens
- As the owner, I want D/D, W/W, M/M portfolio change and a chart vs S&P/Nasdaq so I know if I'm beating the index
- As the owner, I want dividend yield and projected annual dividend income per holding and in total
- As the owner, I want AI analysis on any holding, my whole portfolio, or a stock I don't own, with the estimated cost shown before I run it and a warning if it would exceed my monthly cap
- As the owner, I want an unmissable LIVE indicator so I never confuse real money with demo data

**Visitor (demo mode)**
- As a visitor from GitHub, I want to explore a realistic seeded portfolio with every feature working (AI analysis returns canned examples) so I can evaluate the app without keys
- As a visitor, I want a persistent DEMO banner so I know nothing is real

**Edge cases**
- Stale quote (API down): show last cached price with a visible "as of" timestamp, never blank
- Ticker held in one account at $0 cost basis (401k transfers): allow null avg cost, exclude from gain/loss math, badge it
- CSV with unknown ticker symbols: import valid rows, surface rejects with reasons

## Requirements

### P0 — Phase 1 (ship to prod + GitHub)
| # | Requirement | Acceptance criteria |
|---|---|---|
| 1 | Auth + mode split | Supabase auth, single allowlisted email. Logged-in = LIVE (persistent indicator). Anonymous = DEMO (persistent banner, seeded data) |
| 2 | Account CRUD | Create account with name, broker, type (taxable/401k/roth/brokerage_link). Delete cascades holdings |
| 3 | Holding CRUD + CSV import | Add symbol, qty, avg cost per account. CSV import with per-row validation report |
| 4 | Quote engine | Finnhub quote fetch on load, `pt_quotes` cache, serve cache if < 15 min old, show "as of" timestamp, batch-dedupe symbols |
| 5 | Per-account view | Table: symbol, qty, avg cost, current price, value, gain/loss $, gain/loss %. Columns architecture supports adding fields without refactor |
| 6 | Consolidated view | One row per ticker across all accounts, expandable to per-account breakdown. Same columns |
| 7 | Dashboard widgets | Total portfolio value; S&P 500 and Nasdaq level + day change |
| 8 | Search | Filter my holdings by symbol/name |
| 9 | Demo seed | Realistic ~8-account, ~25-ticker seeded portfolio, `is_demo` flag, anon-readable via RLS |
| 10 | Responsive UI | Works desktop → mobile; tables collapse gracefully |

### P1 — Phase 2 (fast follow)
- SnapTrade connect flow for supported brokerages (Robinhood, Fidelity retail, Schwab); sync positions into same `pt_holdings` model with `source='snaptrade'`
- Daily snapshots (`pt_snapshots`) via Vercel cron; D/D, W/W, M/M change chips
- Portfolio vs S&P 500 vs Nasdaq indexed comparison chart
- Dividend yield + projected annual income per holding and portfolio total
- Rate-limit handling: exponential backoff, sync status per connection

### P2 — Phase 3
- AI analysis: per-stock, whole-portfolio, and research-any-ticker, driven by owner-editable prompt templates
- Cost governance: token-based estimate shown pre-run, `pt_ai_budget` monthly cap, hard warn on projected overage, per-analysis cost logged
- Visual analyzer suite: allocation donut (sector + asset class), position-size treemap, per-ticker account stacked bar, dividend income calendar
- Canned AI responses in demo mode

## Data Model (all prefixed `pt_` in mystudio)

- `pt_accounts` — id, name, broker, account_type, source (manual|snaptrade), is_demo
- `pt_holdings` — account_id, symbol, quantity, avg_cost (nullable), updated_at
- `pt_quotes` — symbol PK, price, day_change_pct, dividend_yield, fetched_at (shared cache)
- `pt_snapshots` — date, total_value, per_account jsonb
- `pt_ai_analyses` — target (symbol|portfolio), prompt_key, content, model, cost_usd, created_at
- `pt_ai_budget` — month PK, limit_usd, spent_usd

RLS: owner-only on live rows; `is_demo=true` rows readable by anon. No credentials, no transactions, ever.

## Success Metrics

- **Leading:** Phase 1 live on Vercel + public GitHub repo within first build cycle; owner can answer "total GOOG exposure" in < 10 sec; quote staleness never exceeds 15 min on an active session
- **Lagging:** Weekly active use by owner sustained 4+ weeks; AI spend stays under monthly cap; at least one external GitHub star/fork/issue (demo mode did its job)

## Open Questions

- **(Owner, non-blocking)** Which Finnhub-unsupported tickers exist in the portfolio (mutual funds like FXAIX)? Mutual fund NAVs may need a secondary source in Phase 2
- **(Owner, blocking for Phase 3)** The AI prompt templates you mentioned providing — needed before Phase 3 starts
- **(Owner, non-blocking)** SnapTrade requires an implementation review before production; start that application during Phase 1 so it doesn't block Phase 2

## Guardrails

1. Never store brokerage credentials (SnapTrade holds the connection tokens)
2. Never store transaction history — positions, cost basis, and daily snapshots only
3. All external keys server-side only; nothing sensitive in the client bundle or the public repo
4. Demo mode makes zero authenticated API calls
