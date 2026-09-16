-- The creator's shoe rotation, as Strava already knows it: brand, model and lifetime distance per pair.
-- Kept on the profile so a public creator page can show it without a Strava call.
alter table profiles add column if not exists strava_gear jsonb;
grant select (strava_gear) on public.profiles to anon, authenticated;
