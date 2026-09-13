-- Each week of a Letter goes out as an issue: a few lines about the week plus the seven days.
-- The creator decides when it goes: now, or scheduled. Runners see a week only once it is sent.

create table letter_issues (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  week int not null check (week >= 1),
  intro text not null default '',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, week)
);

create index letter_issues_program_week_idx on letter_issues (program_id, week);

alter table letter_issues enable row level security;

create policy "creators manage own issues" on letter_issues for all to authenticated
  using (exists (select 1 from programs p where p.id = program_id and p.creator_id = (select auth.uid())))
  with check (exists (select 1 from programs p where p.id = program_id and p.creator_id = (select auth.uid())));

create policy "readers see sent issues" on letter_issues for select to authenticated
  using (sent_at is not null and can_read_program(program_id));

create trigger letter_issues_touch before update on letter_issues
  for each row execute function touch_updated_at();
