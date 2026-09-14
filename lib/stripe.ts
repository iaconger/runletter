import "server-only";
// Stripe client. Server only. Returns null when STRIPE_SECRET_KEY is absent so every caller can degrade:
// buttons still show the price but say "Payments coming soon", the studio card explains what is missing.

import Stripe from "stripe";

let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key, { appInfo: { name: "RunLetter", url: "https://runletter.com" } }) : null;
  return cached;
}

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Platform take in percent. pricing.md: 20 percent, 0 for the launch cohort (per-creator override in profiles.platform_fee_pct). */
export function platformFeePercent(override?: number | null): number {
  if (typeof override === "number" && override >= 0 && override <= 100) return override;
  const env = Number(process.env.PLATFORM_FEE_PERCENT);
  return Number.isFinite(env) && env >= 0 && env <= 100 ? env : 20;
}
