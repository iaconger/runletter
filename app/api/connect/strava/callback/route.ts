// GET /api/connect/strava/callback?code=&state= -> store tokens for the signed-in user.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stravaExchange } from "@/lib/integrations/strava";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const cookie = request.cookies.get("rl_strava_state")?.value ?? "";
  const [state, back = "/app/you"] = cookie.split("|");
  const fail = (msg: string) => NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(msg)}`, request.url));
  if (!q.get("code") || q.get("state") !== state) return fail("Strava connection was cancelled or expired. Try again.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const admin = createAdminClient();
  if (!admin) return fail("Server is missing its Supabase key");
  try {
    const t = await stravaExchange(q.get("code")!);
    const { error } = await admin.from("connections").upsert(
      { user_id: user.id, provider: "strava", external_id: t.athlete ? String(t.athlete.id) : null, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString(), scope: q.get("scope") },
      { onConflict: "user_id,provider" },
    );
    if (error) throw error;
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not connect Strava");
  }
  const res = NextResponse.redirect(new URL(`${back}?connected=strava`, request.url));
  res.cookies.delete("rl_strava_state");
  return res;
}
