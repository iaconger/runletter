-- Creator and runner accounts are separate. The kind is chosen at sign-up ("I'm here to create" / "I'm here to
-- run") and lands on the profile as is_creator, so the app and the studio can each send the other kind away.
-- A creator who wants to run with someone signs up for a runner account with another email.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, handle, display_name, is_creator)
  values (
    new.id,
    'u_' || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'runner') = 'creator'
  );
  return new;
end;
$$;

-- Accounts that already own a program are creators, whatever they signed up as.
update public.profiles p set is_creator = true
where exists (select 1 from public.programs g where g.creator_id = p.id);
