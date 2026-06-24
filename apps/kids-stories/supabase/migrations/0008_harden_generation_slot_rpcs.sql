-- 0008_harden_generation_slot_rpcs.sql
-- Supersedes 0007_rpc_auth_checks: keep generation slot mutation RPCs server-only
-- (they accept caller-supplied uid/daily_limit values). Bind daily-count reads
-- to the current user. Restrict aggregate spend to service role.

create or replace function public.stories_generated_today(uid uuid)
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.generation_log
  where (auth.role() = 'service_role' or auth.uid() = uid)
    and user_id = uid
    and created_at >= date_trunc('day', now() at time zone 'UTC');
$$;

create or replace function public.stories_generated_today(
  uid uuid,
  tz text default 'UTC'
)
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.generation_log
  where (auth.role() = 'service_role' or auth.uid() = uid)
    and user_id = uid
    and created_at >= public.local_day_start(tz);
$$;

create or replace function public.claim_generation_slot(uid uuid, daily_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to claim generation slot' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select count(*) into used
  from public.generation_log
  where user_id = uid
    and created_at >= date_trunc('day', now() at time zone 'UTC');

  if used >= daily_limit then
    return false;
  end if;

  insert into public.generation_log (user_id) values (uid);
  return true;
end;
$$;

create or replace function public.claim_generation_slot(
  uid uuid,
  daily_limit int,
  tz text default 'UTC'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to claim generation slot' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select count(*) into used
  from public.generation_log
  where user_id = uid
    and created_at >= public.local_day_start(tz);

  if used >= daily_limit then
    return false;
  end if;

  insert into public.generation_log (user_id) values (uid);
  return true;
end;
$$;

create or replace function public.release_generation_slot(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to release generation slot' using errcode = '42501';
  end if;

  delete from public.generation_log
  where id = (
    select id from public.generation_log
    where user_id = uid
      and created_at >= date_trunc('day', now() at time zone 'UTC')
    order by created_at desc
    limit 1
  );
end;
$$;

create or replace function public.release_generation_slot(
  uid uuid,
  tz text default 'UTC'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to release generation slot' using errcode = '42501';
  end if;

  delete from public.generation_log
  where id = (
    select id
    from public.generation_log
    where user_id = uid
      and created_at >= public.local_day_start(tz)
    order by created_at desc
    limit 1
  );
end;
$$;

revoke execute on function public.claim_generation_slot(uuid, int) from public, anon, authenticated;
revoke execute on function public.claim_generation_slot(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.release_generation_slot(uuid) from public, anon, authenticated;
revoke execute on function public.release_generation_slot(uuid, text) from public, anon, authenticated;

grant execute on function public.claim_generation_slot(uuid, int) to service_role;
grant execute on function public.claim_generation_slot(uuid, int, text) to service_role;
grant execute on function public.release_generation_slot(uuid) to service_role;
grant execute on function public.release_generation_slot(uuid, text) to service_role;

revoke execute on function public.stories_generated_today(uuid) from public, anon;
revoke execute on function public.stories_generated_today(uuid, text) from public, anon;

grant execute on function public.stories_generated_today(uuid) to authenticated, service_role;
grant execute on function public.stories_generated_today(uuid, text) to authenticated, service_role;

-- Supersedes the weaker 0007_rpc_auth_checks version with service-role-only access.
create or replace function public.ai_spend_this_month()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to read AI spend' using errcode = '42501';
  end if;

  return (
    select coalesce(sum(cost_usd), 0)::numeric
    from public.ai_usage
    where created_at >= date_trunc('month', now() at time zone 'UTC')
  );
end;
$$;

revoke execute on function public.ai_spend_this_month() from public, anon, authenticated;
grant execute on function public.ai_spend_this_month() to service_role;
