-- Two things a creator sells. The Letter: one per creator, ongoing, dated from the week it starts,
-- included with the subscription. Plans: any number, fixed length, bought once, start when you start.

alter table programs add column is_letter boolean not null default false;
create unique index programs_one_letter_per_creator on programs (creator_id) where is_letter;

comment on column programs.is_letter is 'The creator''s ongoing weekly Letter (one per creator). Everything else is a standalone plan.';
