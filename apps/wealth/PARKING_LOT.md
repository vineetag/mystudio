# Parking Lot — P1/P2 temptations deliberately not built in Phase 1

| Logged | Item | Why parked |
|---|---|---|
| M1 | `pt_snapshots`, `pt_ai_analyses`, `pt_ai_budget` tables | Serve P1 (snapshots/benchmarks) and P2 (AI) features only. Migrations are versioned — adding them in their own phase costs nothing; empty tables now invite drift. |
| M1 | Supabase TS type codegen | Shared mystudio project — codegen would drag every other app's tables into this repo. Hand-written types for 3 tables are clearer. Revisit if the schema grows or moves to a dedicated project. |
| M1 | Finnhub free tier has no true index quotes (S&P 500 / Nasdaq levels) | Dashboard widgets (M4) may need ETF proxies (SPY/QQQ) or another source. Decide in M3/M4 — do not silently fabricate index levels. |
| M1 | Mutual fund NAVs (e.g. FXAIX) unsupported on Finnhub free tier | Spec open question. Show "price unavailable" in Phase 1 rather than fake data; secondary source is a Phase 2 call. |
