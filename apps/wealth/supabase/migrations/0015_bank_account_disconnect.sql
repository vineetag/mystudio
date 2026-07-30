-- Disconnect/reconnect handling for SimpleFIN accounts.
--
-- SimpleFIN mints a brand new account id when a bank is unlinked and linked
-- again, so the same real-world account came back as a second pt_bank_accounts
-- row: the dashboard showed two cards for one account and counted the balance
-- twice. The sync now reconciles on a stable identity (institution + account
-- name + currency) and re-keys the existing row instead of inserting a twin.
--
-- disconnected_at marks a row the feed no longer returns and nothing replaced.
-- Rows are flagged rather than deleted: SimpleFIN is the only source of the
-- balance, and a wrongly-dropped account would silently remove real money from
-- net worth. Flagged rows are excluded from the dashboard and its totals, the
-- reason is surfaced in the sync-health banner, and the flag clears by itself
-- if the account shows up in a later sync.

alter table pt_bank_accounts
  add column disconnected_at timestamptz;

comment on column pt_bank_accounts.disconnected_at is
  'Set when a clean sync stopped returning this account. Null = live. Cleared automatically when the account reappears.';
