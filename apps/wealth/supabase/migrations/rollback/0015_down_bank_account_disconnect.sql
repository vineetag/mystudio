-- Rollback 0015. Dropping the column un-hides any account the sync had flagged
-- as disconnected; duplicates from a reconnect will reappear on the dashboard.
alter table pt_bank_accounts
  drop column if exists disconnected_at;
