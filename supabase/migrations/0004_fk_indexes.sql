-- Advisor fix: cover the two foreign keys that had no index.
create index completions_program_day_idx on completions (program_day_id);
create index purchases_program_idx on purchases (program_id);
