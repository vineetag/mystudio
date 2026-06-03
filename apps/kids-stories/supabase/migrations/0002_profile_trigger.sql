-- 0002_profile_trigger.sql
-- Auto-create a public.profiles row whenever a new auth.users row is created.
-- Runs as SECURITY DEFINER so it bypasses RLS (profiles has no INSERT policy by design).
-- display_name is seeded from the signup metadata key `display_name` when provided.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
