-- The shape of any week of a published program is public: the day, whether it is a run, what kind, and the
-- creator's line about it. That is the shop window, and it is what a creator posts for. The numbers (blocks)
-- stay behind a subscription, so "what they are running" is free and "run it yourself" is paid.
drop policy if exists "days readable with access" on program_days;
create policy "days readable with access" on program_days for select to anon, authenticated
  using (can_read_program(program_id) or is_published_program(program_id));
