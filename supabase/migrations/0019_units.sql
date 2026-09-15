-- Miles or kilometres. Chosen in onboarding, changeable in settings, per account (creator or runner).
-- Storage stays metric everywhere; this is a display preference only.

alter table profiles
  add column if not exists units text not null default 'km'
  check (units in ('km', 'mi'));

grant update (units) on profiles to authenticated;
