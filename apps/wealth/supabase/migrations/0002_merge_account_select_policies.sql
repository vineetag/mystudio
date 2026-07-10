-- Advisor fix: pt_accounts had two permissive SELECT policies for the
-- authenticated role (demo-readable + owner-owned), forcing both to run on
-- every query. Merge into a single policy.

drop policy "Demo accounts are readable by everyone" on pt_accounts;
drop policy "Owners can read their own accounts" on pt_accounts;

create policy "Demo accounts readable by everyone, live accounts by owner"
  on pt_accounts for select
  using (is_demo or user_id = (select auth.uid()));
