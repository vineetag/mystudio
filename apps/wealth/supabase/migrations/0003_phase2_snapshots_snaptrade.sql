-- OneFolio Phase 2: daily snapshots, SnapTrade sync, dividend yield cadence.
--
-- Guardrail check (PRODUCT_SPEC.md): pt_snaptrade_users.st_user_secret is
-- SnapTrade's per-user API secret — NOT a brokerage credential. Brokerage
-- connection tokens never leave SnapTrade's side. We still treat it as
-- sensitive: RLS enabled with no policies, so only the service role can
-- touch it and it can never reach the client.

-- ---------------------------------------------------------------------------
-- pt_snapshots — one row per calendar day with the owner's portfolio value,
-- a per-account breakdown, and benchmark closes for the comparison chart.
-- Written by the Vercel cron and by an upsert-on-load; date PK = idempotent.
-- ---------------------------------------------------------------------------

create table pt_snapshots (
  snapshot_date date primary key,
  total_value numeric(20, 2) not null check (total_value >= 0),
  -- [{ account_id, name, value }] — denormalized on purpose: accounts can be
  -- renamed or deleted later without rewriting history.
  per_account jsonb not null default '[]'::jsonb,
  spy_close numeric(20, 6),
  qqq_close numeric(20, 6),
  created_at timestamptz not null default now()
);

alter table pt_snapshots enable row level security;

-- Live portfolio values are the owner's private data. Anonymous (demo) mode
-- gets no history; writes go through the service role only.
create policy "Authenticated users can read snapshots"
  on pt_snapshots for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- pt_snaptrade_users — our Supabase user ↔ SnapTrade user + secret.
-- RLS enabled with NO policies: service-role access only.
-- ---------------------------------------------------------------------------

create table pt_snaptrade_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  st_user_id text not null,
  st_user_secret text not null,
  created_at timestamptz not null default now()
);

alter table pt_snaptrade_users enable row level security;

-- ---------------------------------------------------------------------------
-- pt_snaptrade_connections — sync status per brokerage authorization.
-- id mirrors SnapTrade's authorization id so upserts are natural.
-- ---------------------------------------------------------------------------

create table pt_snaptrade_connections (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  broker text not null default '',
  status text not null default 'connected'
    check (status in ('connected', 'syncing', 'error', 'disabled')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pt_snaptrade_connections_user_id_idx
  on pt_snaptrade_connections (user_id);

create trigger pt_snaptrade_connections_set_updated_at
  before update on pt_snaptrade_connections
  for each row execute function pt_set_updated_at();

alter table pt_snaptrade_connections enable row level security;

-- Owner can see their connection statuses; all writes via service role.
create policy "Owners can read their own connections"
  on pt_snaptrade_connections for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- pt_accounts — synced accounts keep SnapTrade's stable account id so a
-- re-sync updates in place instead of duplicating.
-- ---------------------------------------------------------------------------

alter table pt_accounts add column snaptrade_account_id uuid unique;

-- Synced accounts arrive without a reliable type from the aggregator; they
-- default to taxable and the owner can correct it. Upserts on re-sync omit
-- account_type entirely, so an owner's correction is never overwritten.
alter table pt_accounts alter column account_type set default 'taxable';

-- ---------------------------------------------------------------------------
-- pt_quotes — dividend yield refreshes on its own 24 h cadence (Finnhub
-- /stock/metric), independent of the 15 min price TTL.
-- ---------------------------------------------------------------------------

alter table pt_quotes add column yield_fetched_at timestamptz;
