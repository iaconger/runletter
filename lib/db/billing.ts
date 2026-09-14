import "server-only";
// Billing: Stripe Connect for creators, Checkout for runners, and the rows that grant access.
// Everything here runs with the service role (subscriptions, purchases and enrolments are written only by
// server code), so callers must have checked who is asking. Free stays free: a creator with no Stripe
// account, or a price of 0, enrols runners here without Stripe.

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, platformFeePercent } from "@/lib/stripe";
import { mondayOf } from "@/lib/types";

export type Billing = {
  accountId: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  feePct: number;
};

export type SellableProgram = { id: string; creatorId: string; title: string; isLetter: boolean; priceCents: number | null; fixedStartDate: string | null; status: string };

function admin() {
  const a = createAdminClient();
  if (!a) throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY");
  return a;
}

// ---------- creator side ----------

export async function getBilling(userId: string): Promise<Billing> {
  const { data } = await admin().from("profiles").select("stripe_account_id, stripe_charges_enabled, stripe_details_submitted, platform_fee_pct").eq("id", userId).maybeSingle();
  return {
    accountId: data?.stripe_account_id ?? null,
    chargesEnabled: data?.stripe_charges_enabled ?? false,
    detailsSubmitted: data?.stripe_details_submitted ?? false,
    feePct: platformFeePercent(data?.platform_fee_pct),
  };
}

/** Express account for the creator, created on first call. */
export async function ensureConnectAccount(userId: string, email: string | undefined): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const existing = await getBilling(userId);
  if (existing.accountId) return existing.accountId;
  const account = await stripe.accounts.create({
    type: "express",
    email,
    business_type: "individual",
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { product_description: "Running programs and a weekly training letter, sold to followers on RunLetter." },
    metadata: { runletter_user_id: userId },
  });
  const { error } = await admin().from("profiles").update({ stripe_account_id: account.id }).eq("id", userId);
  if (error) throw error;
  return account.id;
}

export async function createOnboardingLink(accountId: string, origin: string): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/stripe/connect?refresh=1`,
    return_url: `${origin}/api/stripe/connect/return`,
    type: "account_onboarding",
  });
  return link.url;
}

/** Login link to the Express dashboard (payouts, balance). */
export async function createDashboardLink(accountId: string): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

/** Copy the account's readiness onto the profile. Called from the onboarding return and account.updated. */
export async function syncAccountStatus(account: Stripe.Account | string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;
  const acct = typeof account === "string" ? await stripe.accounts.retrieve(account) : account;
  await admin()
    .from("profiles")
    .update({ stripe_charges_enabled: !!acct.charges_enabled, stripe_details_submitted: !!acct.details_submitted })
    .eq("stripe_account_id", acct.id);
}

// ---------- what a runner has ----------

export async function getSellable(programId: string): Promise<SellableProgram | null> {
  const { data } = await admin().from("programs").select("id, creator_id, title, is_letter, price_cents, fixed_start_date, status").eq("id", programId).maybeSingle();
  return data ? { id: data.id, creatorId: data.creator_id, title: data.title, isLetter: data.is_letter, priceCents: data.price_cents, fixedStartDate: data.fixed_start_date, status: data.status } : null;
}

export async function getLetterOf(creatorId: string): Promise<SellableProgram | null> {
  const { data } = await admin().from("programs").select("id, creator_id, title, is_letter, price_cents, fixed_start_date, status").eq("creator_id", creatorId).eq("is_letter", true).maybeSingle();
  return data ? { id: data.id, creatorId: data.creator_id, title: data.title, isLetter: data.is_letter, priceCents: data.price_cents, fixedStartDate: data.fixed_start_date, status: data.status } : null;
}

export type Access = { subscribed: boolean; purchased: boolean };

export async function getAccess(followerId: string, program: SellableProgram): Promise<Access> {
  const a = admin();
  const [{ data: sub }, { data: buy }] = await Promise.all([
    a.from("subscriptions").select("status").eq("follower_id", followerId).eq("creator_id", program.creatorId).eq("status", "active").maybeSingle(),
    a.from("purchases").select("id").eq("follower_id", followerId).eq("program_id", program.id).maybeSingle(),
  ]);
  return { subscribed: !!sub, purchased: !!buy };
}

/** A program is paid when it has a price and its creator can take money. Anything else is free to join. */
export function isPaid(program: SellableProgram, creatorChargesEnabled: boolean): boolean {
  return (program.priceCents ?? 0) > 0 && creatorChargesEnabled;
}

/** Start date for a new enrolment: Letters are dated (everyone is on the same week); plans start this Monday. */
export function enrolStart(program: SellableProgram, today = new Date()): string {
  return program.isLetter && program.fixedStartDate ? program.fixedStartDate : mondayOf(today);
}

export async function enrol(followerId: string, program: SellableProgram): Promise<void> {
  const { error } = await admin().from("enrollments").insert({ follower_id: followerId, program_id: program.id, start_date: enrolStart(program) });
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

/** Grant access without Stripe: a subscription row (Letter) or a purchase row (plan), then the enrolment. */
export async function grantFree(followerId: string, program: SellableProgram): Promise<void> {
  const a = admin();
  if (program.isLetter) {
    const { error } = await a.from("subscriptions").upsert({ follower_id: followerId, creator_id: program.creatorId, status: "active" }, { onConflict: "follower_id,creator_id" });
    if (error) throw error;
  } else {
    const { error } = await a.from("purchases").upsert({ follower_id: followerId, program_id: program.id, amount_cents: 0 }, { onConflict: "follower_id,program_id" });
    if (error) throw error;
  }
  await enrol(followerId, program);
}

// ---------- checkout ----------

export async function createCheckout(input: { followerId: string; email: string | undefined; program: SellableProgram; creatorName: string; origin: string; back: string }): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const { program, followerId } = input;
  const billing = await getBilling(program.creatorId);
  if (!billing.accountId || !billing.chargesEnabled) throw new Error("Creator cannot take payments yet");
  const amount = program.priceCents ?? 0;
  if (amount <= 0) throw new Error("Program is free");
  const { data: me } = await admin().from("profiles").select("stripe_customer_id").eq("id", followerId).maybeSingle();
  const customer = me?.stripe_customer_id ?? undefined;
  const metadata = { kind: program.isLetter ? "letter" : "plan", follower_id: followerId, creator_id: program.creatorId, program_id: program.id };
  const common: Stripe.Checkout.SessionCreateParams = {
    client_reference_id: followerId,
    customer,
    customer_email: customer ? undefined : input.email,
    metadata,
    success_url: `${input.origin}/app/joined?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}${input.back}`,
    allow_promotion_codes: true,
  };
  const session = program.isLetter
    ? await stripe.checkout.sessions.create({
        ...common,
        mode: "subscription",
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amount, recurring: { interval: "month" }, product_data: { name: `${input.creatorName}'s Letter`, description: program.title } } }],
        subscription_data: { application_fee_percent: billing.feePct, transfer_data: { destination: billing.accountId }, metadata },
      })
    : await stripe.checkout.sessions.create({
        ...common,
        mode: "payment",
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name: program.title, description: `A plan by ${input.creatorName}` } } }],
        payment_intent_data: { application_fee_amount: Math.round((amount * billing.feePct) / 100), transfer_data: { destination: billing.accountId }, metadata },
        customer_creation: "always",
      });
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return session.url;
}

/** Turn a paid Checkout session into rows. Safe to call twice (webhook and the return page both do). */
export async function fulfilCheckoutSession(session: Stripe.Checkout.Session): Promise<{ programId: string | null }> {
  const m = session.metadata ?? {};
  const followerId = m.follower_id ?? session.client_reference_id ?? null;
  const programId = m.program_id ?? null;
  if (!followerId || !programId) return { programId: null };
  if (session.payment_status !== "paid" && session.status !== "complete") return { programId };
  const program = await getSellable(programId);
  if (!program) return { programId };
  const a = admin();
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  if (customerId) await a.from("profiles").update({ stripe_customer_id: customerId }).eq("id", followerId);
  if (session.mode === "subscription") {
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
    const { error } = await a.from("subscriptions").upsert(
      { follower_id: followerId, creator_id: program.creatorId, status: "active", stripe_subscription_id: subId, stripe_customer_id: customerId },
      { onConflict: "follower_id,creator_id" },
    );
    if (error) throw error;
  } else {
    const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    const { error } = await a.from("purchases").upsert(
      { follower_id: followerId, program_id: program.id, stripe_payment_intent_id: piId, stripe_checkout_session_id: session.id, amount_cents: session.amount_total ?? program.priceCents ?? 0 },
      { onConflict: "follower_id,program_id" },
    );
    if (error) throw error;
  }
  await enrol(followerId, program);
  return { programId };
}

function mapSubStatus(s: Stripe.Subscription.Status): "active" | "canceled" | "past_due" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "past_due";
  return "canceled";
}

function periodEnd(sub: Stripe.Subscription): string | null {
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const t = legacy ?? item?.current_period_end;
  return t ? new Date(t * 1000).toISOString() : null;
}

/** customer.subscription.updated / deleted: mirror the status and end the enrolment when it is over. */
export async function applySubscription(sub: Stripe.Subscription): Promise<void> {
  const a = admin();
  const status = mapSubStatus(sub.status);
  const { data: row } = await a.from("subscriptions").select("follower_id, creator_id").eq("stripe_subscription_id", sub.id).maybeSingle();
  if (!row) {
    // Never seen: recover from metadata set at checkout.
    const m = sub.metadata ?? {};
    if (!m.follower_id || !m.creator_id) return;
    const { error } = await a.from("subscriptions").upsert(
      { follower_id: m.follower_id, creator_id: m.creator_id, status, stripe_subscription_id: sub.id, stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id, current_period_end: periodEnd(sub), cancel_at_period_end: !!sub.cancel_at_period_end },
      { onConflict: "follower_id,creator_id" },
    );
    if (error) throw error;
    return;
  }
  const { error } = await a
    .from("subscriptions")
    .update({ status, current_period_end: periodEnd(sub), cancel_at_period_end: !!sub.cancel_at_period_end })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw error;
  if (status === "canceled") {
    const letter = await getLetterOf(row.creator_id);
    if (letter) await a.from("enrollments").update({ status: "dropped" }).eq("follower_id", row.follower_id).eq("program_id", letter.id).eq("status", "active");
  }
}

/** Record an event id once. False when it was already handled. */
export async function claimEvent(id: string, type: string): Promise<boolean> {
  const { error } = await admin().from("stripe_events").insert({ id, type });
  if (!error) return true;
  if (/duplicate|unique/i.test(error.message)) return false;
  throw error;
}

export async function releaseEvent(id: string): Promise<void> {
  await admin().from("stripe_events").delete().eq("id", id);
}

/** The runner's own subscription to a creator, for the You page. */
export async function listMySubscriptions(followerId: string): Promise<{ creatorId: string; status: string; stripe: boolean; cancelAtPeriodEnd: boolean; periodEnd: string | null }[]> {
  const { data } = await admin().from("subscriptions").select("creator_id, status, stripe_subscription_id, cancel_at_period_end, current_period_end").eq("follower_id", followerId);
  return (data ?? []).map((r) => ({ creatorId: r.creator_id, status: r.status, stripe: !!r.stripe_subscription_id, cancelAtPeriodEnd: r.cancel_at_period_end, periodEnd: r.current_period_end }));
}

/** Cancel at period end (Stripe) or right away (free). */
export async function cancelSubscription(followerId: string, creatorId: string): Promise<void> {
  const a = admin();
  const { data: row } = await a.from("subscriptions").select("stripe_subscription_id").eq("follower_id", followerId).eq("creator_id", creatorId).maybeSingle();
  if (!row) return;
  const stripe = getStripe();
  if (row.stripe_subscription_id && stripe) {
    await stripe.subscriptions.update(row.stripe_subscription_id, { cancel_at_period_end: true });
    await a.from("subscriptions").update({ cancel_at_period_end: true }).eq("follower_id", followerId).eq("creator_id", creatorId);
    return;
  }
  await a.from("subscriptions").update({ status: "canceled" }).eq("follower_id", followerId).eq("creator_id", creatorId);
  const letter = await getLetterOf(creatorId);
  if (letter) await a.from("enrollments").update({ status: "dropped" }).eq("follower_id", followerId).eq("program_id", letter.id).eq("status", "active");
}
