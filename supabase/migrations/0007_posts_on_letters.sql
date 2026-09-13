-- Creator updates can point at a Letter (program) or a single workout (program day).
-- A post with neither is a general update to everyone who follows the creator.

alter table creator_posts
  add column program_id uuid references programs(id) on delete cascade,
  add column program_day_id uuid references program_days(id) on delete cascade;

create index creator_posts_program_id_idx on creator_posts (program_id);
create index creator_posts_program_day_id_idx on creator_posts (program_day_id);
create index creator_posts_creator_created_idx on creator_posts (creator_id, created_at desc);
