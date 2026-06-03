-- 0003_ai_usage.sql
-- AI spend ledger. Backs the hard monthly spend cap enforced in lib/ai.ts
-- (a monorepo hard rule). One row per Claude API call with token counts and an
-- estimated USD cost. RLS is ON with NO policies, so only the service-role
-- client (which bypasses RLS) can read/write it — never the browser.

create table public.ai_usage (
  id            bigserial primary key,
  user_id       uuid references auth.users(id) on delete set null,
  model         text not null,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  cost_usd      numeric(10,6) not null default 0,
  created_at    timestamptz default now()
);
alter table public.ai_usage enable row level security;

create index ai_usage_created_at_idx on public.ai_usage (created_at);

-- Month-to-date spend (UTC). SECURITY DEFINER so the service role can sum
-- without per-row policies. Returns 0 when no usage has been logged yet.
create or replace function public.ai_spend_this_month()
returns numeric language sql security definer as $$
  select coalesce(sum(cost_usd), 0)::numeric
  from public.ai_usage
  where created_at >= date_trunc('month', now() at time zone 'UTC');
$$;
