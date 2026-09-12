-- Watch and tracker connections, for runners and creators alike. Strava reports finished runs (completion).
-- Garmin accepts pushed workouts (once our developer-program keys exist). COROS is file import for now.
-- Tokens are written and read only by server code with the service role; the browser never sees them.

create type connection_provider as enum ('strava', 'garmin', 'coros');
create type push_status as enum ('queued', 'sent', 'failed', 'skipped');

create table connections (
  user_id uuid not null references profiles (id) on delete cascade,
  provider connection_provider not null,
  external_id text,            -- athlete id on the provider
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
create index connections_provider_external_idx on connections (provider, external_id);
create trigger connections_touch before update on connections for each row execute function touch_updated_at();

alter table connections enable row level security;
create policy "users see own connections" on connections for select to authenticated using (user_id = (select auth.uid()));
create policy "users remove own connections" on connections for delete to authenticated using (user_id = (select auth.uid()));
revoke all on connections from anon, authenticated;
grant select (user_id, provider, external_id, scope, created_at, updated_at) on connections to authenticated;
grant delete on connections to authenticated;

-- One row per runner, per workout, per provider: the plan to put that day on their watch.
create table workout_pushes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  program_day_id uuid not null references program_days (id) on delete cascade,
  provider connection_provider not null,
  scheduled_for date,          -- the calendar date the workout belongs on
  status push_status not null default 'queued',
  external_ref text,           -- provider's id for the pushed workout
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, program_day_id, provider)
);
create index workout_pushes_queue_idx on workout_pushes (status, created_at) where status = 'queued';
create index workout_pushes_user_idx on workout_pushes (user_id, scheduled_for);
create index workout_pushes_program_day_idx on workout_pushes (program_day_id);

alter table workout_pushes enable row level security;
create policy "users see own pushes" on workout_pushes for select to authenticated using (user_id = (select auth.uid()));
