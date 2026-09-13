-- Runs that came in from Strava but matched no planned day (a rest-day run, a second run, a race).
-- Shown small on the runner's week and to the creator on the Runners page. Written by the webhook only.

create table extra_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  run_date date not null,
  source completion_source not null default 'strava',
  strava_activity_id text unique,
  name text,
  distance_m int,
  duration_s int,
  avg_pace_s int,
  created_at timestamptz not null default now()
);
create index extra_runs_user_date_idx on extra_runs (user_id, run_date desc);

alter table extra_runs enable row level security;
create policy "runner reads own extras" on extra_runs for select to authenticated using (user_id = (select auth.uid()));
create policy "creator reads extras of enrolled runners" on extra_runs for select to authenticated
  using (exists (select 1 from enrollments e join programs p on p.id = e.program_id where e.follower_id = extra_runs.user_id and e.status = 'active' and p.creator_id = (select auth.uid())));
