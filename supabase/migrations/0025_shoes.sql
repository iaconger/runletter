-- Shoes a runner picks in the app, rather than whatever Strava happens to know. A pair can be linked to a
-- Strava gear id, and then its mileage comes along for free; unlinked pairs are simply what they run in.
create table if not exists shoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  brand text not null,
  model text not null,
  nickname text,
  colour text not null default 'cobalt',
  strava_gear_id text,
  distance_m int not null default 0,
  retired boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shoes_user_idx on shoes (user_id, retired, created_at);

alter table shoes enable row level security;
-- A creator's shoes are part of their public page, so anyone may read them; only the owner writes.
create policy "shoes are public" on shoes for select to anon, authenticated using (true);
create policy "own shoes insert" on shoes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own shoes update" on shoes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own shoes delete" on shoes for delete to authenticated using (user_id = (select auth.uid()));

-- The grants, which is the step that bit us before.
grant select on public.shoes to anon, authenticated;
grant insert, update, delete on public.shoes to authenticated;
