// GET /api/stripe/dashboard -> the creator's Stripe Express dashboard (balance, payouts).
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { createDashboardLink, getBilling } from "@/lib/db/billing";

export async function GET(request: NextRequest) {
  const origin = publicOrigin(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/studio/page", origin));
  try {
    const b = await getBilling(user.id);
    if (!b.accountId) return NextResponse.redirect(new URL("/api/stripe/connect", origin));
    return NextResponse.redirect(await createDashboardLink(b.accountId));
  } catch (e) {
    console.error("stripe dashboard", e);
    return NextResponse.redirect(new URL(`/studio/page?error=${encodeURIComponent("Stripe did not answer. Try again.")}`, origin));
  }
}
