-- A run the runner dragged onto a day of their own calendar. It points at a creator's published run
-- (program_days); nothing is copied, so if the creator edits the run the runner sees the edit.
create table if not exists scheduled_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  program_day_id uuid not null references program_days (id) on delete cascade,
  run_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, run_date, program_day_id)
);
create index if not exists scheduled_runs_user_date_idx on scheduled_runs (user_id, run_date);

alter table scheduled_runs enable row level security;
create policy "runner reads own scheduled runs" on scheduled_runs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "runner schedules runs they can read" on scheduled_runs for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from program_days d where d.id = program_day_id
      and (can_read_program(d.program_id) or (d.week = 1 and is_published_program(d.program_id)))));
create policy "runner moves own scheduled runs" on scheduled_runs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "runner removes own scheduled runs" on scheduled_runs for delete to authenticated
  using (user_id = (select auth.uid()));
