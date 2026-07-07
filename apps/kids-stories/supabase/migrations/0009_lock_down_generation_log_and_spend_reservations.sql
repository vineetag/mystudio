-- 0009_lock_down_generation_log_and_spend_reservations.sql
-- Close two abuse paths:
-- 1. Browser clients no longer insert directly into the operational quota table.
-- 2. AI calls reserve monthly budget under a DB lock before spending externally.

drop policy if exists "Users insert own logs" on public.generation_log;
revoke insert on table public.generation_log from public, anon, authenticated;

create index if not exists generation_log_user_created_at_idx
  on public.generation_log (user_id, created_at desc);

create or replace function public.reserve_ai_spend(
  p_uid uuid,
  p_model text,
  p_estimated_cost numeric,
  p_monthly_budget numeric
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_spend numeric;
  reservation_id bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to reserve AI spend' using errcode = '42501';
  end if;

  if p_estimated_cost <= 0 or p_monthly_budget <= 0 then
    raise exception 'Invalid AI spend reservation values' using errcode = '22023';
  end if;

  -- Serialize reservations globally so concurrent requests cannot all observe
  -- the same pre-call spend and overshoot the monthly cap.
  perform pg_advisory_xact_lock(hashtextextended('ai_spend_monthly_budget', 0));

  select coalesce(sum(cost_usd), 0)::numeric into current_spend
  from public.ai_usage
  where created_at >= date_trunc('month', now() at time zone 'UTC');

  if current_spend + p_estimated_cost > p_monthly_budget then
    return null;
  end if;

  insert into public.ai_usage (user_id, model, cost_usd)
  values (p_uid, p_model || ':reserved', p_estimated_cost)
  returning id into reservation_id;

  return reservation_id;
end;
$$;

create or replace function public.finalize_ai_spend_reservation(
  p_reservation_id bigint,
  p_uid uuid,
  p_model text,
  p_input_tokens int,
  p_output_tokens int,
  p_cost_usd numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to finalize AI spend' using errcode = '42501';
  end if;

  update public.ai_usage
  set user_id = p_uid,
      model = p_model,
      input_tokens = greatest(coalesce(p_input_tokens, 0), 0),
      output_tokens = greatest(coalesce(p_output_tokens, 0), 0),
      cost_usd = greatest(coalesce(p_cost_usd, 0), 0)
  where id = p_reservation_id;

  if not found then
    raise exception 'AI spend reservation not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.release_ai_spend_reservation(
  p_reservation_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized to release AI spend' using errcode = '42501';
  end if;

  delete from public.ai_usage
  where id = p_reservation_id
    and model like '%:reserved';
end;
$$;

revoke execute on function public.reserve_ai_spend(uuid, text, numeric, numeric)
  from public, anon, authenticated;
revoke execute on function public.finalize_ai_spend_reservation(bigint, uuid, text, int, int, numeric)
  from public, anon, authenticated;
revoke execute on function public.release_ai_spend_reservation(bigint)
  from public, anon, authenticated;

grant execute on function public.reserve_ai_spend(uuid, text, numeric, numeric)
  to service_role;
grant execute on function public.finalize_ai_spend_reservation(bigint, uuid, text, int, int, numeric)
  to service_role;
grant execute on function public.release_ai_spend_reservation(bigint)
  to service_role;
