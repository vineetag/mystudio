-- Accounts can be hidden: excluded from the dashboard view, portfolio total,
-- and daily snapshots, while remaining fully manageable on /accounts.
alter table pt_accounts
  add column hidden boolean not null default false;
