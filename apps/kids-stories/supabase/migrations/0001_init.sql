-- 0001_init.sql
-- ZippyTales initial schema: profiles, stories, generation_log + rate-limit helper.
-- NOTE: This was first applied manually in the Supabase dashboard (mystudio project)
-- and is captured here verbatim as the canonical, versioned record of that change.

-- Profiles
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  created_at   timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Stories
create table public.stories (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  child_name   text not null,
  theme        text not null check (theme in ('adventure','animals','space','fantasy')),
  age_range    text,
  title        text not null,
  content      text not null,
  illustration text,          -- emoji for MVP; image URL in v2
  is_public    boolean default true,
  created_at   timestamptz default now()
);
alter table public.stories enable row level security;
create policy "Anyone views public stories" on public.stories for select using (is_public = true);
create policy "Owners view all stories"     on public.stories for select using (auth.uid() = user_id);
create policy "Owners insert stories"       on public.stories for insert with check (auth.uid() = user_id);
create policy "Owners delete stories"       on public.stories for delete using (auth.uid() = user_id);

-- Daily generation log (rate limiting)
create table public.generation_log (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.generation_log enable row level security;
create policy "Users insert own logs" on public.generation_log for insert with check (auth.uid() = user_id);
create policy "Users view own logs"   on public.generation_log for select using (auth.uid() = user_id);

-- Helper: count today's generations
create or replace function public.stories_generated_today(uid uuid)
returns int language sql security definer as $$
  select count(*)::int from public.generation_log
  where user_id = uid
    and created_at >= date_trunc('day', now() at time zone 'UTC');
$$;
