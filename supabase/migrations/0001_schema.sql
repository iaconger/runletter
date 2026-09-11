-- RunLetter schema v1. Mirrors 02-product/data-model.md in the project docs.
-- Apply with `supabase db push` (see README). Keep lib/types.ts in step with this file.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type program_goal as enum ('base', '5k', '10k', 'half', 'marathon', 'other');
create type program_level as enum ('beginner', 'intermediate', 'advanced');
create type start_rule as enum ('rolling', 'fixed');
create type program_access as enum ('creator_sub', 'one_time');
create type program_status as enum ('draft', 'published', 'archived');
create type day_kind as enum ('run', 'rest', 'cross');
create type run_type as enum ('easy', 'tempo', 'intervals', 'long', 'recovery', 'race');
create type block_kind as enum ('warmup', 'work', 'recovery', 'cooldown');
create type block_measure as enum ('time', 'distance');
create type effort as enum ('easy', 'moderate', 'hard', 'all_out');
create type subscription_status as enum ('active', 'canceled', 'past_due');
create type enrollment_status as enum ('active', 'paused', 'completed', 'dropped');
create type completion_source as enum ('manual', 'strava');

-- ---------- profiles ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  is_creator boolean not null default false,
  links jsonb not null default '{}'::jsonb,
  strava_athlete_id text,
  strava_tokens jsonb, -- encrypted at the application layer before insert
  stripe_account_id text, -- Stripe Connect Express account (creators)
  stripe_customer_id text, -- Stripe customer (followers)
  created_at timestamptz not null default now()
);

-- Create a profile row when a user signs up. Handle defaults to a short id; user picks a real one in onboarding.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (new.id, 'u_' || substr(replace(new.id::text, '-', ''), 1, 12), coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- programs ----------
create table programs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  cover_url text,
  goal program_goal not null default 'base',
  level program_level not null default 'intermediate',
  weeks int not null check (weeks between 1 and 52),
  start_rule start_rule not null default 'rolling',
  fixed_start_date date,
  access program_access not null default 'creator_sub',
  price_cents int check (price_cents is null or price_cents >= 0),
  status program_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_rule <> 'fixed' or fixed_start_date is not null),
  check (access <> 'one_time' or price_cents is not null)
);
create index programs_creator_idx on programs (creator_id);
create index programs_published_idx on programs (status) where status = 'published';

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger programs_touch before update on programs for each row execute function touch_updated_at();

-- ---------- program_days ----------
create table program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  week int not null check (week >= 1),
  day int not null check (day between 1 and 7), -- 1 = Monday
  kind day_kind not null default 'rest',
  run_type run_type,
  note text not null default '',
  unique (program_id, week, day),
  check (kind <> 'run' or run_type is not null)
);

-- ---------- blocks ----------
create table blocks (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days (id) on delete cascade,
  position int not null check (position >= 0),
  kind block_kind not null,
  measure block_measure not null default 'time',
  duration_s int check (duration_s is null or duration_s > 0),
  distance_m int check (distance_m is null or distance_m > 0),
  target_effort effort,
  target_pace_min int check (target_pace_min is null or target_pace_min > 0), -- sec/km, faster bound
  target_pace_max int check (target_pace_max is null or target_pace_max > 0),
  repeat_group uuid,
  repeat_count int check (repeat_count is null or repeat_count >= 2),
  unique (program_day_id, position),
  check ((measure = 'time' and duration_s is not null) or (measure = 'distance' and distance_m is not null))
);

-- ---------- subscriptions (follower -> creator) ----------
create table subscriptions (
  follower_id uuid not null references profiles (id) on delete cascade,
  creator_id uuid not null references profiles (id) on delete cascade,
  stripe_subscription_id text unique,
  status subscription_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id)
);
create index subscriptions_creator_idx on subscriptions (creator_id);

-- ---------- purchases (one-time program) ----------
create table purchases (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references profiles (id) on delete cascade,
  program_id uuid not null references programs (id) on delete cascade,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  unique (follower_id, program_id)
);

-- ---------- enrollments ----------
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references profiles (id) on delete cascade,
  program_id uuid not null references programs (id) on delete cascade,
  start_date date not null, -- a Monday
  status enrollment_status not null default 'active',
  created_at timestamptz not null default now()
);
create index enrollments_follower_idx on enrollments (follower_id);
create index enrollments_program_idx on enrollments (program_id);
-- One active enrollment per follower per program.
create unique index enrollments_one_active on enrollments (follower_id, program_id) where status = 'active';

-- ---------- completions ----------
create table completions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  program_day_id uuid not null references program_days (id) on delete cascade,
  completed_at timestamptz not null default now(),
  source completion_source not null default 'manual',
  strava_activity_id text,
  distance_m int,
  duration_s int,
  avg_pace_s int,
  unique (enrollment_id, program_day_id)
);

-- ---------- creator_posts ----------
create table creator_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index creator_posts_creator_idx on creator_posts (creator_id, created_at desc);

-- ---------- access helpers ----------
-- True when the caller may read a program's content (its days and blocks).
create or replace function can_read_program(p_program_id uuid)
returns boolean
language sql
stable
security invoker set search_path = public
as $$
  select exists (
    select 1 from programs p
    where p.id = p_program_id
      and (
        p.creator_id = (select auth.uid())
        or (
          p.status = 'published'
          and (
            exists (select 1 from subscriptions s where s.follower_id = (select auth.uid()) and s.creator_id = p.creator_id and s.status = 'active')
            or exists (select 1 from purchases pu where pu.follower_id = (select auth.uid()) and pu.program_id = p.id)
          )
        )
      )
  );
$$;

-- Today's day for a follower: active enrollment, week/day from start_date.
create or replace function today_for_follower(p_follower_id uuid, p_date date default current_date)
returns table (enrollment_id uuid, program_id uuid, program_day_id uuid, week int, day int)
language sql
stable
security invoker
as $$
  select e.id, e.program_id, pd.id, pd.week, pd.day
  from enrollments e
  join programs p on p.id = e.program_id
  join lateral (
    select ((p_date - e.start_date) / 7) + 1 as week, ((p_date - e.start_date) % 7) + 1 as day
  ) d on true
  left join program_days pd on pd.program_id = e.program_id and pd.week = d.week and pd.day = d.day
  where e.follower_id = p_follower_id
    and e.status = 'active'
    and p_date >= e.start_date
    and d.week <= p.weeks
  order by e.created_at desc
  limit 1;
$$;

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
on conflict (id) do nothing;
