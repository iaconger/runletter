// "Get paid": Stripe Connect Express onboarding and status for the creator. Server component.
// Status: not started / pending (details in, charges not yet enabled) / ready. Degrades to "coming soon" without keys.
import Link from "next/link";
import { getBilling } from "@/lib/db/billing";
import { stripeEnabled } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtPrice } from "@/lib/types";

export async function GetPaid({ userId, letterPriceCents, notice }: { userId: string; letterPriceCents: number | null; notice?: { stripe?: string; error?: string } }) {
  const enabled = stripeEnabled() && !!createAdminClient();
  const b = enabled ? await getBilling(userId).catch(() => null) : null;
  const state: "off" | "none" | "pending" | "ready" = !enabled ? "off" : !b?.accountId ? "none" : b.chargesEnabled ? "ready" : "pending";
  const chip =
    state === "ready" ? <span className="rl-chip rl-chip-success">Ready</span>
    : state === "pending" ? <span className="rl-chip rl-chip-accent">Pending</span>
    : state === "none" ? <span className="rl-chip">Not started</span>
    : <span className="rl-chip">Coming soon</span>;
  return (
    <section className="rl-card" aria-label="Get paid" style={{ gap: "var(--rl-space-4)" }}>
      <div className="rl-between" style={{ alignItems: "center" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">Get paid</span>
          <span className="t-heading">Stripe</span>
        </div>
        {chip}
      </div>
      {notice?.error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{notice.error}</span>}
      <div className="rl-row" style={{ gap: "var(--rl-space-2)" }}>
        <span className="rl-chip">Letter {letterPriceCents ? fmtPrice(letterPriceCents, "mo") : "free"}</span>
        {b && <span className="rl-chip">RunLetter keeps {b.feePct}%</span>}
      </div>
      <div className="rl-row">
        {state === "off" && <button type="button" className="rl-btn rl-btn-secondary" disabled>Connect Stripe</button>}
        {state === "none" && <Link href="/api/stripe/connect" className="rl-btn rl-btn-primary">Connect Stripe</Link>}
        {state === "pending" && <Link href="/api/stripe/connect" className="rl-btn rl-btn-primary">Finish Stripe setup</Link>}
        {state === "ready" && <Link href="/api/stripe/dashboard" className="rl-btn rl-btn-secondary">Stripe dashboard</Link>}
        {state !== "off" && <Link href="/studio" className="rl-btn rl-btn-ghost">Prices</Link>}
      </div>
    </section>
  );
}
