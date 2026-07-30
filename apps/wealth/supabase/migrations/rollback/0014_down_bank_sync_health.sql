-- ROLLBACK for 0014_bank_sync_health.sql
--
-- Drops the SimpleFIN sync-health table. Safe to run any time: the table holds
-- only the last sync's warning strings, which the next sync rewrites anyway —
-- no balance or account data lives here.
--
-- This file lives in a SUBDIRECTORY on purpose: scripts/run-migrations.mjs only
-- globs top-level *.sql, so it will NEVER auto-apply. Run it by hand:
--
--   psql "$DATABASE_URL" -f supabase/migrations/rollback/0014_down_bank_sync_health.sql
--
-- Revert the app layer alongside it — recordBankSyncHealth()/getBankSyncHealth()
-- read this table, and the reconnect banner reads that query.

begin;

drop table if exists pt_bank_sync_health;

-- Clear 0014 from the ledger so `pnpm db:migrate` can re-apply it later.
delete from public._schema_migrations
  where filename = '0014_bank_sync_health.sql';

commit;
