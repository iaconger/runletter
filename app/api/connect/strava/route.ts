// GET /api/connect/strava -> send the signed-in user to Strava to approve. State is a random nonce in a cookie.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stravaAuthorizeUrl, stravaEnabled } from "@/lib/integrations/strava";

export async function GET(request: NextRequest) {
  const back = request.nextUrl.searchParams.get("back") ?? "/app/you";
  if (!stravaEnabled()) return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent("Strava is not configured on the server yet")}`, request.url));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(back)}`, request.url));
  const state = crypto.randomUUID();
  const origin = request.headers.get("x-forwarded-host") ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}` : request.nextUrl.origin;
  const res = NextResponse.redirect(stravaAuthorizeUrl(`${origin}/api/connect/strava/callback`, state));
  res.cookies.set("rl_strava_state", `${state}|${back}`, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
