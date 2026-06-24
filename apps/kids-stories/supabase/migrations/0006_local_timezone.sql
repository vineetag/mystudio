-- 0006_local_timezone.sql
-- Daily rate limits and admin stats use the visitor's local timezone instead of UTC.
-- Clients pass an IANA timezone (e.g. America/Los_Angeles); invalid values fall back to UTC.

create or replace function public.resolve_timezone(tz text)
returns text
language plpgsql
immutable
as $$
begin
  if tz is null or btrim(tz) = '' then
    return 'UTC';
  end if;
  if exists (select 1 from pg_timezone_names where name = tz) then
    return tz;
  end if;
  return 'UTC';
end;
$$;

create or replace function public.local_day_start(tz text default 'UTC')
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('day', now() at time zone public.resolve_timezone(tz))
    at time zone public.resolve_timezone(tz)
  );
$$;

create or replace function public.local_month_start(tz text default 'UTC')
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('month', now() at time zone public.resolve_timezone(tz))
    at time zone public.resolve_timezone(tz)
  );
$$;

create or replace function public.stories_generated_today(uid uuid, tz text default 'UTC')
returns int
language sql
security definer
as $$
  select count(*)::int
  from public.generation_log
  where user_id = uid
    and created_at >= public.local_day_start(tz);
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
