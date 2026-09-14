// GET /api/stripe/connect/return -> back from Stripe onboarding. Copy the account state onto the profile.
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { getBilling, syncAccountStatus } from "@/lib/db/billing";

export async function GET(request: NextRequest) {
  const origin = publicOrigin(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/studio/page", origin));
  try {
    const b = await getBilling(user.id);
    if (b.accountId) await syncAccountStatus(b.accountId);
  } catch (e) {
    console.error("stripe return", e);
  }
  return NextResponse.redirect(new URL("/studio/page?stripe=1", origin));
}
