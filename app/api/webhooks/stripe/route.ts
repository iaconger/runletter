// Stripe webhook. Verifies the signature, records the event id once (idempotent), then mirrors the event:
// checkout.session.completed -> subscription or purchase row + enrolment
// customer.subscription.updated / deleted -> status, and the Letter enrolment ends when it is over
// account.updated -> creator's charges_enabled flag
// Register the endpoint and these events in the Stripe dashboard (03-build/setup.md §10).
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { applySubscription, claimEvent, fulfilCheckoutSession, releaseEvent, syncAccountStatus } from "@/lib/db/billing";
import { track } from "@/lib/analytics";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  // Two endpoints in Stripe (account events, connected-account events) mean two signing secrets.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter((s): s is string => !!s);
  if (!stripe || secrets.length === 0) return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });
  const body = await request.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
      break;
    } catch {
      // try the next secret
    }
  }
  if (!event) return NextResponse.json({ error: "bad signature" }, { status: 400 });
  try {
    if (!(await claimEvent(event.id, event.type))) return NextResponse.json({ ok: true, duplicate: true });
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { programId } = await fulfilCheckoutSession(session);
        const m = session.metadata ?? {};
        if (m.follower_id) track("checkout_completed", { kind: m.kind, program_id: programId, creator_id: m.creator_id, amount_cents: session.amount_total }, m.follower_id);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await applySubscription(sub);
        const ended = event.type === "customer.subscription.deleted" || sub.status === "canceled";
        if (ended && sub.metadata?.follower_id) track("subscription_cancelled", { creator_id: sub.metadata.creator_id }, sub.metadata.follower_id);
        break;
      }
      case "account.updated":
        await syncAccountStatus(event.data.object);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("stripe webhook", event.type, e);
    // 500 makes Stripe retry; drop the event id row so the retry is not treated as a duplicate.
    await releaseEvent(event.id).catch(() => {});
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
