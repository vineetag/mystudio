-- Shared household owners: let more than one allowlisted email act as owner
-- over ONE shared portfolio (e.g. spouses), each signing in with their own
-- account. Previously every live row was scoped to a single user_id via
-- `user_id = auth.uid()`, so a second account saw an empty portfolio even when
-- allowlisted at the app layer.
--
-- RLS cannot read the app's OWNER_EMAILS env var, so the owner set is mirrored
-- into the DB here. TWO SOURCES OF TRUTH, keep them in sync:
--   * OWNER_EMAILS env var      -> app-layer gate (live mode, /admin, magic link)
--   * pt_owner_emails table     -> RLS row visibility (this file)
-- Adding or removing an owner later means updating BOTH.
--
-- Owner user_ids are resolved dynamically from auth.users by email, so a new
-- owner is picked up automatically the moment their first magic link creates
-- their auth.users row — no hardcoded uuid, no chicken-and-egg.

-- ---------------------------------------------------------------------------
-- Owner allowlist (RLS-visible mirror of OWNER_EMAILS)
-- ---------------------------------------------------------------------------
create table pt_owner_emails (
  email text primary key check (email = lower(email))
);

-- RLS on, with NO public read policy: the allowlist is only ever read through
-- the security-definer helpers below, never directly by a client.
alter table pt_owner_emails enable row level security;

-- Seed the current owners. Replace the second address with the real one, and
-- keep this list identical to OWNER_EMAILS.
insert into pt_owner_emails (email) values
  ('vineet140@gmail.com'),
  ('aditiagarwa@gmail.com')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so they can read auth.users / pt_owner_emails
-- regardless of the caller's RLS; search_path pinned to '' so every reference
-- must be schema-qualified (guards against search_path injection).
-- ---------------------------------------------------------------------------

-- Is the CURRENT session one of the allowlisted owners?
create or replace function public.pt_is_owner()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1
    from public.pt_owner_emails oe
    where oe.email = lower(auth.jwt() ->> 'email')
  );
$$;

-- The set of user_ids belonging to allowlisted owners (the shared household).
create or replace function public.pt_owner_uids()
  returns setof uuid
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select u.id
  from auth.users u
  where lower(u.email) in (select email from public.pt_owner_emails);
$$;

grant execute on function public.pt_is_owner() to authenticated, anon;
grant execute on function public.pt_owner_uids() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- pt_accounts — read/update/delete follow household membership; insert stays
-- self-attributed (each owner's additions carry their own user_id, but both
-- owners can see and edit either's rows).
-- ---------------------------------------------------------------------------
drop policy "Demo accounts readable by everyone, live accounts by owner" on pt_accounts;
drop policy "Owners can insert their own accounts" on pt_accounts;
drop policy "Owners can update their own accounts" on pt_accounts;
drop policy "Owners can delete their own accounts" on pt_accounts;

create policy "Demo accounts readable by everyone, live accounts by household"
  on pt_accounts for select
  using (
    is_demo
    or (public.pt_is_owner() and user_id in (select public.pt_owner_uids()))
  );

create policy "Owners can insert their own accounts"
  on pt_accounts for insert
  to authenticated
  with check (public.pt_is_owner() and user_id = (select auth.uid()) and not is_demo);

create policy "Owners can update household accounts"
  on pt_accounts for update
  to authenticated
  using (public.pt_is_owner() and user_id in (select public.pt_owner_uids()))
  with check (public.pt_is_owner() and user_id in (select public.pt_owner_uids()) and not is_demo);

create policy "Owners can delete household accounts"
  on pt_accounts for delete
  to authenticated
  using (public.pt_is_owner() and user_id in (select public.pt_owner_uids()));

-- ---------------------------------------------------------------------------
-- pt_holdings — access follows the parent account, now household-scoped.
-- ---------------------------------------------------------------------------
drop policy "Holdings of demo or owned accounts are readable" on pt_holdings;
drop policy "Owners can insert holdings into their accounts" on pt_holdings;
drop policy "Owners can update holdings in their accounts" on pt_holdings;
drop policy "Owners can delete holdings in their accounts" on pt_holdings;

create policy "Holdings of demo or household accounts are readable"
  on pt_holdings for select
  using (
    exists (
      select 1 from pt_accounts a
      where a.id = account_id
        and (
          a.is_demo
          or (public.pt_is_owner() and a.user_id in (select public.pt_owner_uids()))
        )
    )
  );

create policy "Owners can insert holdings into household accounts"
  on pt_holdings for insert
  to authenticated
  with check (
    public.pt_is_owner()
    and exists (
      select 1 from pt_accounts a
      where a.id = account_id and a.user_id in (select public.pt_owner_uids())
    )
  );

create policy "Owners can update holdings in household accounts"
  on pt_holdings for update
  to authenticated
  using (
    public.pt_is_owner()
    and exists (
      select 1 from pt_accounts a
      where a.id = account_id and a.user_id in (select public.pt_owner_uids())
    )
  )
  with check (
    public.pt_is_owner()
    and exists (
      select 1 from pt_accounts a
      where a.id = account_id and a.user_id in (select public.pt_owner_uids())
    )
  );

create policy "Owners can delete holdings in household accounts"
  on pt_holdings for delete
  to authenticated
  using (
    public.pt_is_owner()
    and exists (
      select 1 from pt_accounts a
      where a.id = account_id and a.user_id in (select public.pt_owner_uids())
    )
  );

-- ---------------------------------------------------------------------------
-- pt_ai_analyses — shared AI history across the household (read-only here;
-- writes go through the service role).
-- ---------------------------------------------------------------------------
drop policy "Owners can read their own analyses" on pt_ai_analyses;

create policy "Owners can read household analyses"
  on pt_ai_analyses for select
  to authenticated
  using (public.pt_is_owner() and user_id in (select public.pt_owner_uids()));
