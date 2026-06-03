-- 0004_generation_slot.sql
-- Atomic daily-rate-limit claim, fixing the check-then-act race where two
-- concurrent requests could both pass a separate count check and over-spend a
-- user's daily allowance. claim_generation_slot serializes per-user via an
-- advisory lock, re-counts, and inserts the log row in one transaction.
-- release_generation_slot refunds a claimed slot when generation later fails.

create or replace function public.claim_generation_slot(uid uuid, daily_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
begin
  -- Serialize concurrent claims for the same user (released at txn end).
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

create or replace function public.release_generation_slot(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
