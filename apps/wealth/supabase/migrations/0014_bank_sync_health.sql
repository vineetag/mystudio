-- pt_bank_sync_health — the warnings SimpleFIN returns alongside balances.
--
-- SimpleFIN's `errors` array carries the only signal that a connection has
-- gone bad ("Connection to <bank> may need attention. Auth required"). Those
-- balances keep arriving from cache, so a dead connection is otherwise
-- invisible: nothing throws, the sync reports success, and the account simply
-- stops moving. Persisting the array lets the dashboard surface it on page
-- load instead of only in the response to a manual sync.
--
-- Single-row table (id is a fixed sentinel) — this is the state of the one
-- SimpleFIN access URL the deployment holds, not per-user data. Same
-- single-owner/service-role-writes model as pt_bank_accounts.

create table pt_bank_sync_health (
  id boolean primary key default true check (id),
  -- Verbatim SimpleFIN error strings plus our own skipped-account reasons.
  -- Empty array = last sync was clean.
  errors jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now()
);

alter table pt_bank_sync_health enable row level security;

create policy "Authenticated users can read bank sync health"
  on pt_bank_sync_health for select
  to authenticated
  using (true);
