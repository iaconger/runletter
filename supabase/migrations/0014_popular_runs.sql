-- Most-completed workouts across published programs, for Explore. Definer so counts include everyone's
-- completions, but only for days anyone could already see (published programs), and only counts come out.
create or replace function popular_runs(p_limit int default 12)
returns table (program_day_id uuid, program_id uuid, completions bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.program_day_id, d.program_id, count(*)::bigint as completions
  from completions c
  join program_days d on d.id = c.program_day_id
  join programs p on p.id = d.program_id
  where p.status = 'published' and d.kind = 'run' and c.completed_at > now() - interval '30 days'
  group by c.program_day_id, d.program_id
  order by completions desc, max(c.completed_at) desc
  limit greatest(1, least(p_limit, 50));
$$;
revoke all on function popular_runs(int) from public;
grant execute on function popular_runs(int) to anon, authenticated;
