-- Column privileges were locked down when the advisors were run (0003/0004), and every column added since
-- then was born with no grant. Reading a profile selects `units`, so since 0019 a signed-in creator's own
-- profile came back "permission denied" and every studio page rendered as if nobody was signed in.
-- Grant the new columns the app actually reads. Tokens, Stripe ids and the fee override stay ungranted.
grant select (units) on public.profiles to anon, authenticated;
grant select (last_sync_at, last_sync_count, last_sync_error) on public.connections to authenticated;
