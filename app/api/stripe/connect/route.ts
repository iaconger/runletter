// GET /api/stripe/connect -> create the creator's Express account if needed and send them to Stripe onboarding.
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { stripeEnabled } from "@/lib/stripe";
import { createOnboardingLink, ensureConnectAccount } from "@/lib/db/billing";

export async function GET(request: NextRequest) {
  const origin = publicOrigin(request);
  const back = "/studio/page";
  if (!stripeEnabled()) return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent("Payments are not set up on the server yet")}`, origin));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(back)}`, origin));
  try {
    const accountId = await ensureConnectAccount(user.id, user.email);
    const url = await createOnboardingLink(accountId, origin);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("stripe connect", e);
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent("Stripe did not answer. Try again.")}`, origin));
  }
}
