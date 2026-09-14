-- Bring in as much of Strava as we can, so the app feels like the runner's from the first sync.
-- extra_runs grows into "activities": every sport, with elevation, heart rate, kudos and the route sketch.
-- profiles gets the athlete's totals (this year, all time, last four weeks) and the Strava profile we prefill from.

alter table extra_runs
  add column if not exists sport_type text not null default 'Run',
  add column if not exists start_time timestamptz,
  add column if not exists elevation_m int,
  add column if not exists avg_hr int,
  add column if not exists max_hr int,
  add column if not exists kudos int,
  add column if not exists polyline text,
  add column if not exists city text;

comment on column extra_runs.polyline is 'Strava summary polyline (encoded). Drawn as a small route sketch, never stored as a map.';

alter table profiles
  add column if not exists strava_stats jsonb,
  add column if not exists strava_synced_at timestamptz;

comment on column profiles.strava_stats is 'Athlete totals from Strava: recent (4 weeks), ytd and all-time run/ride/swim counts, distance, time, elevation.';

grant select (strava_stats, strava_synced_at) on profiles to authenticated;
