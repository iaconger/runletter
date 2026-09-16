-- Who is running with a creator, for their public page. Security definer because enrollments are private
-- by policy; this returns only what a profile already shows publicly, and only for runners who have not
-- asked to stay off the list.
alter table profiles add column if not exists list_publicly boolean not null default true;
grant select (list_publicly) on public.profiles to anon, authenticated;
grant update (list_publicly) on public.profiles to authenticated;

create or replace function public.creator_followers(p_creator uuid, p_limit int default 24)
returns table (id uuid, handle text, display_name text, avatar_url text, since timestamptz)
language sql security definer set search_path = public stable as $$
  select p.id, p.handle, p.display_name, p.avatar_url, min(e.created_at) as since
  from enrollments e
  join programs pr on pr.id = e.program_id
  join profiles p on p.id = e.follower_id
  where pr.creator_id = p_creator and e.status = 'active' and p.list_publicly and p.id <> p_creator
  group by p.id, p.handle, p.display_name, p.avatar_url
  order by min(e.created_at) desc
  limit greatest(1, least(p_limit, 60));
$$;
revoke all on function public.creator_followers(uuid, int) from public;
grant execute on function public.creator_followers(uuid, int) to anon, authenticated;
