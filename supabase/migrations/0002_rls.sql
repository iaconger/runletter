-- Row level security. Rule of thumb from data-model.md:
-- creators write only their own programs; followers write only their own enrollments and completions.

alter table profiles enable row level security;
alter table programs enable row level security;
alter table program_days enable row level security;
alter table blocks enable row level security;
alter table subscriptions enable row level security;
alter table purchases enable row level security;
alter table enrollments enable row level security;
alter table completions enable row level security;
alter table creator_posts enable row level security;

-- ---------- profiles ----------
-- Public read (creator pages are public). Strava/Stripe columns are exposed only through server code
-- that uses the service role; the anon/authenticated roles are denied those columns below.
create policy "profiles are public" on profiles for select using (true);
create policy "users update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

revoke all on profiles from anon, authenticated;
grant select (id, handle, display_name, avatar_url, bio, is_creator, links, created_at) on profiles to anon, authenticated;
grant update (handle, display_name, avatar_url, bio, is_creator, links) on profiles to authenticated;

-- ---------- programs ----------
create policy "published programs are public" on programs for select using (status = 'published' or creator_id = auth.uid());
create policy "creators insert own programs" on programs for insert with check (creator_id = auth.uid());
create policy "creators update own programs" on programs for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "creators delete own programs" on programs for delete using (creator_id = auth.uid());

-- ---------- program_days / blocks ----------
-- Readable by the creator and by followers with access (subscription or purchase).
create policy "days readable with access" on program_days for select using (can_read_program(program_id));
create policy "creators write days" on program_days for all
  using (exists (select 1 from programs p where p.id = program_id and p.creator_id = auth.uid()))
  with check (exists (select 1 from programs p where p.id = program_id and p.creator_id = auth.uid()));

create policy "blocks readable with access" on blocks for select
  using (exists (select 1 from program_days d where d.id = program_day_id and can_read_program(d.program_id)));
create policy "creators write blocks" on blocks for all
  using (exists (select 1 from program_days d join programs p on p.id = d.program_id where d.id = program_day_id and p.creator_id = auth.uid()))
  with check (exists (select 1 from program_days d join programs p on p.id = d.program_id where d.id = program_day_id and p.creator_id = auth.uid()));

-- ---------- subscriptions / purchases ----------
-- Written only by the Stripe webhook (service role). Followers and creators can read their own side.
create policy "follower or creator reads subscription" on subscriptions for select
  using (follower_id = auth.uid() or creator_id = auth.uid());
create policy "follower reads own purchases" on purchases for select using (follower_id = auth.uid());
create policy "creator reads purchases of own programs" on purchases for select
  using (exists (select 1 from programs p where p.id = program_id and p.creator_id = auth.uid()));

-- ---------- enrollments ----------
create policy "follower reads own enrollments" on enrollments for select using (follower_id = auth.uid());
create policy "creator reads enrollments in own programs" on enrollments for select
  using (exists (select 1 from programs p where p.id = program_id and p.creator_id = auth.uid()));
create policy "follower enrolls with access" on enrollments for insert
  with check (follower_id = auth.uid() and can_read_program(program_id));
create policy "follower updates own enrollment" on enrollments for update
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- ---------- completions ----------
create policy "follower reads own completions" on completions for select
  using (exists (select 1 from enrollments e where e.id = enrollment_id and e.follower_id = auth.uid()));
create policy "creator reads completions in own programs" on completions for select
  using (exists (select 1 from enrollments e join programs p on p.id = e.program_id where e.id = enrollment_id and p.creator_id = auth.uid()));
create policy "follower writes own completions" on completions for insert
  with check (exists (select 1 from enrollments e where e.id = enrollment_id and e.follower_id = auth.uid()));
create policy "follower deletes own completions" on completions for delete
  using (exists (select 1 from enrollments e where e.id = enrollment_id and e.follower_id = auth.uid()));

-- ---------- creator_posts ----------
create policy "subscribers read posts" on creator_posts for select
  using (creator_id = auth.uid() or exists (select 1 from subscriptions s where s.follower_id = auth.uid() and s.creator_id = creator_posts.creator_id and s.status = 'active'));
create policy "creators write own posts" on creator_posts for all
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- ---------- storage: covers ----------
create policy "covers are public" on storage.objects for select using (bucket_id = 'covers');
create policy "creators upload own covers" on storage.objects for insert
  with check (bucket_id = 'covers' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
create policy "creators replace own covers" on storage.objects for update
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "creators delete own covers" on storage.objects for delete
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
