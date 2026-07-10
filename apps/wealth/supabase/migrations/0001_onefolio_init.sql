-- OneFolio Phase 1 schema: accounts, holdings, shared quote cache.
-- All objects prefixed pt_ so the whole app can later be lifted into its
-- own Supabase project with a single schema dump.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type pt_account_type as enum ('taxable', '401k', 'roth_ira', 'brokerage_link');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table pt_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  broker text not null check (char_length(broker) between 1 and 100),
  account_type pt_account_type not null,
  source text not null default 'manual' check (source in ('manual', 'snaptrade')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Live rows must belong to a user; demo rows must not.
  constraint pt_accounts_demo_ownership check (
    (is_demo and user_id is null) or (not is_demo and user_id is not null)
  )
);

create index pt_accounts_user_id_idx on pt_accounts (user_id);

create table pt_holdings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references pt_accounts (id) on delete cascade,
  symbol text not null check (symbol = upper(symbol) and char_length(symbol) between 1 and 12),
  quantity numeric(20, 6) not null check (quantity > 0),
  -- Nullable: 401k transfers arrive without a cost basis. Null rows are
  -- badged in the UI and excluded from gain/loss math.
  avg_cost numeric(20, 6) check (avg_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, symbol)
);

create index pt_holdings_account_id_idx on pt_holdings (account_id);
create index pt_holdings_symbol_idx on pt_holdings (symbol);

-- Shared quote cache, one row per symbol. Written only by the server
-- (service role) from Finnhub; readable by everyone including demo mode.
create table pt_quotes (
  symbol text primary key check (symbol = upper(symbol) and char_length(symbol) between 1 and 12),
  price numeric(20, 6) not null,
  day_change_pct numeric(10, 4),
  dividend_yield numeric(10, 4),
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create function pt_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pt_accounts_set_updated_at
  before update on pt_accounts
  for each row execute function pt_set_updated_at();

create trigger pt_holdings_set_updated_at
  before update on pt_holdings
  for each row execute function pt_set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Demo rows (is_demo = true, user_id null) are world-readable and only
-- writable by the service role (no client-side write path exists for them).
-- Live rows are readable/writable solely by their owning user. The
-- OWNER_EMAIL allowlist is enforced at the application layer; RLS is the
-- database-level guard.
-- ---------------------------------------------------------------------------

alter table pt_accounts enable row level security;
alter table pt_holdings enable row level security;
alter table pt_quotes enable row level security;

-- pt_accounts
create policy "Demo accounts are readable by everyone"
  on pt_accounts for select
  using (is_demo);

create policy "Owners can read their own accounts"
  on pt_accounts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Owners can insert their own accounts"
  on pt_accounts for insert
  to authenticated
  with check (user_id = (select auth.uid()) and not is_demo);

create policy "Owners can update their own accounts"
  on pt_accounts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and not is_demo);

create policy "Owners can delete their own accounts"
  on pt_accounts for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- pt_holdings (access follows the parent account)
create policy "Holdings of demo or owned accounts are readable"
  on pt_holdings for select
  using (
    exists (
      select 1 from pt_accounts a
      where a.id = account_id
        and (a.is_demo or a.user_id = (select auth.uid()))
    )
  );

create policy "Owners can insert holdings into their accounts"
  on pt_holdings for insert
  to authenticated
  with check (
    exists (
      select 1 from pt_accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
  );

create policy "Owners can update holdings in their accounts"
  on pt_holdings for update
  to authenticated
  using (
    exists (
      select 1 from pt_accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from pt_accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
  );

create policy "Owners can delete holdings in their accounts"
  on pt_holdings for delete
  to authenticated
  using (
    exists (
      select 1 from pt_accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
  );

-- pt_quotes: prices are not sensitive and demo mode needs them.
-- No insert/update/delete policies — writes go through the service role only.
create policy "Quotes are readable by everyone"
  on pt_quotes for select
  using (true);
