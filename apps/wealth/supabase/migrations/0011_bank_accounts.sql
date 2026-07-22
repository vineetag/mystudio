-- pt_bank_accounts — checking/savings balances synced from SimpleFIN Bridge.
-- Balances only, no transactions. One row per SimpleFIN account, upserted by
-- the sync job (service role); the dashboard reads the cached rows and never
-- calls SimpleFIN directly.
--
-- Single-owner model, mirroring pt_snapshots: no user_id column. RLS exposes
-- rows to authenticated users only — sign-in is allowlisted to the owner, so
-- demo/anonymous viewers read nothing. All writes go through the service
-- role (sync job and owner-guarded server actions), so no insert/update
-- policies are needed.

create table pt_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  simplefin_account_id text unique not null,
  institution_name text not null,
  account_name text not null,
  -- Best-effort guess from the account name at first sync; owner can correct
  -- it in the UI. Display-only — aggregation never branches on it.
  account_type text not null default 'unknown'
    check (account_type in ('checking', 'savings', 'unknown')),
  currency text not null default 'USD',
  balance numeric not null,
  available_balance numeric,
  -- When the institution says the balance was accurate (SimpleFIN balance-date).
  balance_date timestamptz,
  last_synced_at timestamptz not null default now(),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table pt_bank_accounts enable row level security;

create policy "Authenticated users can read bank accounts"
  on pt_bank_accounts for select
  to authenticated
  using (true);
