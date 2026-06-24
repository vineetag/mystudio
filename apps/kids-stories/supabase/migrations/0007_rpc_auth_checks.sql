-- 0007_rpc_auth_checks.sql
-- SECURITY DEFINER rate-limit RPCs accepted arbitrary uid values from the
-- browser anon key. Require auth.uid() = uid for authenticated callers; the
-- service role (auth.uid() IS NULL) may still invoke on behalf of any user.

create or replace function public.stories_generated_today(uid uuid, tz text default 'UTC')
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> uid then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return (
    select count(*)::int
    from public.generation_log
    where user_id = uid
      and created_at >= public.local_day_start(tz)
  );
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
  if auth.uid() is not null and auth.uid() <> uid then
    raise exception 'not authorized' using errcode = '42501';
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

create or replace function public.release_generation_slot(uid uuid, tz text default 'UTC')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> uid then
    raise exception 'not authorized' using errcode = '42501';
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

-- Aggregate spend is service-role only; block browser callers entirely.
create or replace function public.ai_spend_this_month()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return (
    select coalesce(sum(cost_usd), 0)::numeric
    from public.ai_usage
    where created_at >= date_trunc('month', now() at time zone 'UTC')
  );
end;
$$;
