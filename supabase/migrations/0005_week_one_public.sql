-- Week 1 of a published program is public: it's the sales page preview. Later weeks still need a subscription or purchase.
create or replace function is_published_program(p_program_id uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from programs p where p.id = p_program_id and p.status = 'published');
$$;

drop policy "days readable with access" on program_days;
create policy "days readable with access" on program_days for select to anon, authenticated
  using (can_read_program(program_id) or (week = 1 and is_published_program(program_id)));

drop policy "blocks readable with access" on blocks;
create policy "blocks readable with access" on blocks for select to anon, authenticated
  using (exists (select 1 from program_days d where d.id = program_day_id and (can_read_program(d.program_id) or (d.week = 1 and is_published_program(d.program_id)))));
