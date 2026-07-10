-- OneFolio M1: per-symbol metadata (company name + logo domain) and
-- brokerage logo URLs.
--
-- pt_symbols is a shared, per-ticker cache — one row per symbol, written only
-- by the server (service role) from logo.dev, readable by everyone including
-- demo mode. Mirrors the pt_quotes model. A row may also hold an owner-entered
-- manual name (name_source='manual'), which the logo.dev refresh never
-- overwrites — that is how funds logo.dev can't name get a persisted label.

-- ---------------------------------------------------------------------------
-- pt_symbols
-- ---------------------------------------------------------------------------

create table pt_symbols (
  symbol text primary key check (symbol = upper(symbol) and char_length(symbol) between 1 and 12),
  -- Official company / fund name. Null until resolved or entered by the owner.
  name text check (name is null or char_length(name) between 1 and 120),
  -- Resolved company domain (logo.dev search). Drives the higher-quality
  -- logo-by-domain image; null falls back to the logo-by-ticker image.
  domain text check (domain is null or char_length(domain) between 1 and 253),
  -- 'logodev' = auto-resolved (safe to refresh); 'manual' = owner-entered (kept).
  name_source text not null default 'logodev' check (name_source in ('logodev', 'manual')),
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pt_symbols_set_updated_at
  before update on pt_symbols
  for each row execute function pt_set_updated_at();

-- Prices/names are not sensitive and demo mode needs them. Reads open to all;
-- writes go through the service role only (no client-side write policy).
alter table pt_symbols enable row level security;

create policy "Symbols are readable by everyone"
  on pt_symbols for select
  using (true);

-- ---------------------------------------------------------------------------
-- Brokerage logos
-- ---------------------------------------------------------------------------

-- Official broker logo captured from SnapTrade on sync (live accounts). Demo
-- and manual accounts resolve a bundled Simple Icons SVG by broker name in the
-- UI instead, so this stays null for them.
alter table pt_accounts add column broker_logo_url text;

-- Same, stored on the connection row for the connected-brokerages list.
alter table pt_snaptrade_connections add column logo_url text;
