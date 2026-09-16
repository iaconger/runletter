-- Make a failed Strava sync visible instead of silent: the last attempt, what came back, and the error if any.
alter table connections add column if not exists last_sync_at timestamptz;
alter table connections add column if not exists last_sync_count int;
alter table connections add column if not exists last_sync_error text;
