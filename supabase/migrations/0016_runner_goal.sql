-- Runner questionnaire: what they are running for, when the race is, how many days a week they have.
-- Asked once in onboarding (skippable), editable on /app/you. Today and Explore rank runs with it.

alter table profiles add column goal program_goal;                      -- null = not answered; 'other' = Just running
alter table profiles add column race_date date;
alter table profiles add column days_per_week int check (days_per_week is null or days_per_week between 1 and 7);
comment on column profiles.goal is 'What the runner is running for. other = just running (the default when they pick nothing specific).';
comment on column profiles.days_per_week is 'Days a week they can run; used to rank runs and plans.';

grant select (goal, race_date, days_per_week) on profiles to authenticated;
grant update (goal, race_date, days_per_week) on profiles to authenticated;
