-- ROLLBACK for 0013_shared_household_owners.sql
--
-- Reverts the shared-household RLS back to the original single-owner model
-- (user_id = auth.uid()). Restores the exact policies from 0001/0002/0009,
-- then drops the household policies, helper functions, and pt_owner_emails.
--
-- This file lives in a SUBDIRECTORY on purpose: scripts/run-migrations.mjs only
-- globs top-level *.sql, so it will NEVER auto-apply. Run it by hand:
--
--   psql "$DATABASE_URL" -f supabase/migrations/rollback/0013_down_shared_household_owners.sql
--
-- (or paste into the Supabase SQL editor). The final statement clears 0013 from
-- the migration ledger so `pnpm db:migrate` can re-apply it later if wanted.
--
-- NOTE: after rolling back the DB, also revert the app layer to match — set the
-- prod OWNER_EMAILS/OWNER_EMAIL back to a single owner, or the app will still
-- grant live mode to a second email whose rows RLS now hides (they would see an
-- empty portfolio, not an error).

begin;

-- ---------------------------------------------------------------------------
-- Drop the household policies added by 0013
-- ---------------------------------------------------------------------------
drop policy if exists "Demo accounts readable by everyone, live accounts by household" on pt_accounts;
drop policy if exists "Owners can insert their own accounts" on pt_accounts;
drop policy if exists "Owners can update household accounts" on pt_accounts;
drop policy if exists "Owners can delete household accounts" on pt_accounts;

drop policy if exists "Holdings of demo or household accounts are readable" on pt_holdings;
drop policy if exists "Owners can insert holdings into household accounts" on pt_holdings;
drop policy if exists "Owners can update holdings in household accounts" on pt_holdings;
drop policy if exists "Owners can delete holdings in household accounts" on pt_holdings;

drop policy if exists "Owners can read household analyses" on pt_ai_analyses;

-- ---------------------------------------------------------------------------
-- Restore original pt_accounts policies (0001, as merged by 0002)
-- ---------------------------------------------------------------------------
create policy "Demo accounts readable by everyone, live accounts by owner"
  on pt_accounts for select
  using (is_demo or user_id = (select auth.uid()));

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

-- ---------------------------------------------------------------------------
-- Restore original pt_holdings policies (0001)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Restore original pt_ai_analyses policy (0009)
-- ---------------------------------------------------------------------------
create policy "Owners can read their own analyses"
  on pt_ai_analyses for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Drop the helpers and allowlist table introduced by 0013
-- ---------------------------------------------------------------------------
drop function if exists public.pt_owner_uids();
drop function if exists public.pt_is_owner();
drop table if exists pt_owner_emails;

-- Clear 0013 from the ledger so `pnpm db:migrate` can re-apply it later.
delete from public._schema_migrations
  where filename = '0013_shared_household_owners.sql';

commit;
