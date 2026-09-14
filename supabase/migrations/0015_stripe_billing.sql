-- Stripe Connect + Checkout. Creators onboard to an Express account; runners pay through Checkout.
-- The Letter is a monthly subscription per creator (price on the Letter program's price_cents);
-- plans are one-time purchases (price_cents on the plan). Rows in subscriptions / purchases are written
-- only by server code with the service role (webhook, return page, free enrol). Free stays free:
-- a creator with no Stripe account, or a price of 0, enrols runners without Stripe at all.

-- ---------- creator payout state ----------
alter table profiles add column if not exists stripe_charges_enabled boolean not null default false;
alter table profiles add column if not exists stripe_details_submitted boolean not null default false;
-- Platform fee override per creator (null = platform default, PLATFORM_FEE_PERCENT env, 20). 0 for the launch cohort.
alter table profiles add column if not exists platform_fee_pct int check (platform_fee_pct is null or platform_fee_pct between 0 and 100);

comment on column profiles.stripe_account_id is 'Stripe Connect Express account id. Server only.';
comment on column profiles.stripe_charges_enabled is 'Mirror of Stripe account.charges_enabled; true means Subscribe and Buy buttons go through Checkout.';
comment on column profiles.platform_fee_pct is 'Per-creator application fee percent. Null = platform default.';

-- Public read of the ready flag so creator pages can show live buttons. Account ids stay server-only.
grant select (stripe_charges_enabled) on profiles to anon, authenticated;

-- Existing Letters had no price. Default them to $7 a month; the creator can set 0 to keep it free.
update programs set price_cents = 700 where is_letter and price_cents is null;

-- ---------- subscriptions ----------
alter table subscriptions add column if not exists stripe_customer_id text;
alter table subscriptions add column if not exists current_period_end timestamptz;
alter table subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table subscriptions add column if not exists updated_at timestamptz not null default now();
drop trigger if exists subscriptions_touch on subscriptions;
create trigger subscriptions_touch before update on subscriptions for each row execute function touch_updated_at();

-- ---------- purchases ----------
alter table purchases add column if not exists stripe_checkout_session_id text unique;
alter table purchases add column if not exists amount_cents int check (amount_cents is null or amount_cents >= 0);

-- ---------- stripe_events: one row per handled event id, for idempotent webhooks ----------
create table if not exists stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table stripe_events enable row level security;
-- No policies on purpose: only the service role reads or writes this table.
revoke all on stripe_events from anon, authenticated;
