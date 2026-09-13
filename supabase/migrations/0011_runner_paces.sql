-- A runner's current 5K time. Creators write effort; this turns effort into that runner's own paces
-- (on the watch and on the screen). Optional; without it the watch gets heart-rate zones.

alter table profiles add column pace_5k_s int check (pace_5k_s is null or (pace_5k_s between 600 and 3600));
comment on column profiles.pace_5k_s is 'Current 5K time in seconds; drives personal pace bands per effort.';

grant select (pace_5k_s) on profiles to anon, authenticated;
grant update (pace_5k_s) on profiles to authenticated;
