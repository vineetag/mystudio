-- OneFolio Phase 3: AI analysis, owner-editable prompt templates, and the
-- cost governance that bounds Claude spend (PRODUCT_SPEC.md P2).
--
-- Guardrail check: nothing here stores brokerage credentials or transactions.
-- pt_ai_analyses keeps the generated text plus the token/cost accounting so a
-- month's spend can be reconstructed from rows rather than trusted from a
-- single running total.

-- ---------------------------------------------------------------------------
-- pt_ai_prompts — owner-editable prompt templates.
--
-- Templates live in the database, not in code, so wording can change from
-- /admin without a deploy. `user_template` is rendered with {{placeholders}}
-- filled from server-derived portfolio context — raw user input is never sent
-- to the model on its own (studio AI rule: always a system prompt).
-- ---------------------------------------------------------------------------

create table pt_ai_prompts (
  key text primary key check (key in ('stock', 'portfolio', 'research')),
  label text not null,
  description text not null default '',
  system_prompt text not null check (char_length(system_prompt) between 1 and 8000),
  user_template text not null check (char_length(user_template) between 1 and 8000),
  updated_at timestamptz not null default now()
);

create trigger pt_ai_prompts_set_updated_at
  before update on pt_ai_prompts
  for each row execute function pt_set_updated_at();

alter table pt_ai_prompts enable row level security;

-- Readable by anyone: demo mode shows the same templates it would run live.
-- Writes go through the service role after an owner check in the server action.
create policy "Anyone can read prompt templates"
  on pt_ai_prompts for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- pt_ai_analyses — one row per completed analysis, with its cost.
-- Doubles as the per-user rate-limit ledger (count rows in the last hour).
-- ---------------------------------------------------------------------------

create table pt_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('symbol', 'portfolio')),
  -- Ticker for 'symbol' targets; 'ALL' for whole-portfolio runs.
  target text not null check (char_length(target) between 1 and 24),
  prompt_key text not null references pt_ai_prompts (key),
  model text not null,
  content text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_usd numeric(10, 6) not null default 0 check (cost_usd >= 0),
  created_at timestamptz not null default now()
);

create index pt_ai_analyses_user_created_idx
  on pt_ai_analyses (user_id, created_at desc);

alter table pt_ai_analyses enable row level security;

-- Owners read their own analyses. Demo mode gets canned responses from code
-- and never reads this table. All writes go through the service role.
create policy "Owners can read their own analyses"
  on pt_ai_analyses for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- pt_ai_budget — one row per calendar month (YYYY-MM), the hard spend cap.
--
-- spent_usd is a denormalized running total for cheap reads; pt_ai_analyses
-- is the source of truth if the two ever disagree.
-- ---------------------------------------------------------------------------

create table pt_ai_budget (
  month text primary key check (month ~ '^\d{4}-\d{2}$'),
  limit_usd numeric(10, 2) not null default 5.00 check (limit_usd >= 0),
  spent_usd numeric(10, 6) not null default 0 check (spent_usd >= 0),
  updated_at timestamptz not null default now()
);

create trigger pt_ai_budget_set_updated_at
  before update on pt_ai_budget
  for each row execute function pt_set_updated_at();

alter table pt_ai_budget enable row level security;

create policy "Authenticated users can read the budget"
  on pt_ai_budget for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Default prompt templates.
--
-- Starter wording — the owner edits these in /admin. Every template forbids
-- fabricated figures and requires the model to work from the supplied context
-- block, because the portfolio numbers are derived server-side and the model
-- has no other source for them.
-- ---------------------------------------------------------------------------

insert into pt_ai_prompts (key, label, description, system_prompt, user_template) values
(
  'stock',
  'Single holding',
  'Analyzes one position you own, using its live figures and its weight in the portfolio.',
  'You are a careful equity analyst writing for a self-directed retail investor who already owns the position.

Rules you must follow:
- Work only from the DATA block supplied in the user message. Never invent prices, ratios, earnings dates, or news.
- If a figure is missing or marked unavailable, say so plainly instead of estimating it.
- Be concrete about concentration and position sizing — that is the main thing the reader cannot see at a glance.
- No buy/sell/hold recommendation and no price targets. Describe risks and considerations; let the reader decide.
- Plain prose and short markdown headings. No preamble, no disclaimers about being an AI.

End with a short "What to watch" list of 2-4 specific, checkable items.',
  'Analyze my position in {{symbol}}.

DATA
{{context}}'
),
(
  'portfolio',
  'Whole portfolio',
  'Reviews diversification, concentration, and asset mix across every account.',
  'You are a portfolio analyst reviewing a self-directed retail investor''s full holdings across several accounts.

Rules you must follow:
- Work only from the DATA block supplied in the user message. Never invent holdings, prices, or sector labels that are not present.
- Lead with concentration: the largest positions by weight, and whether any single name or theme dominates.
- Then cover asset-class mix, account structure, and income (dividend yield) if the data supports it.
- Call out what the data does NOT let you assess (e.g. unpriced symbols, missing cost basis) rather than glossing over it.
- No buy/sell/hold recommendations, no price targets, no allocation prescriptions framed as advice.
- Plain prose and short markdown headings. No preamble, no disclaimers about being an AI.

End with a short "Questions to ask yourself" list of 3-5 items specific to this portfolio.',
  'Review my portfolio.

DATA
{{context}}'
),
(
  'research',
  'Research a ticker',
  'Researches a symbol you do not own, from general knowledge plus any live quote we have.',
  'You are an equity research assistant briefing a self-directed retail investor on a company they do NOT currently own.

Rules you must follow:
- The DATA block may be sparse or empty — this is a company outside the reader''s portfolio. Say what you know from general knowledge, and be explicit that your knowledge has a training cutoff and may be stale.
- Never present remembered figures (revenue, margins, valuation) as current. Date them or qualify them.
- If a live quote appears in the DATA block, use it for price and treat it as the only current figure you have.
- Cover: what the business actually does, how it makes money, the main risks, and what would need to be true for the thesis to work.
- No buy/sell/hold recommendation and no price targets.
- Plain prose and short markdown headings. No preamble, no disclaimers about being an AI.

End with a short "What to verify" list of 2-4 items the reader should check against a current source.',
  'Research {{symbol}} for me. I do not own it.

DATA
{{context}}'
);

-- Seed the current month so the cap exists before the first analysis runs.
insert into pt_ai_budget (month, limit_usd)
values (to_char(now() at time zone 'utc', 'YYYY-MM'), 5.00);
