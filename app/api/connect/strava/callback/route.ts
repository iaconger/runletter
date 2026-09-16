// GET /api/connect/strava/callback?code=&state= -> store tokens for the signed-in user.
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stravaExchange, syncAndNote } from "@/lib/integrations/strava";
import { track } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const cookie = request.cookies.get("rl_strava_state")?.value ?? "";
  const [state, back = "/app/you"] = cookie.split("|");
  const fail = (msg: string) => NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(msg)}`, publicOrigin(request)));
  if (!q.get("code") || q.get("state") !== state) return fail("Strava connection was cancelled or expired. Try again.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", publicOrigin(request)));
  const admin = createAdminClient();
  if (!admin) return fail("Server is missing its Supabase key");
  try {
    const t = await stravaExchange(q.get("code")!);
    const { error } = await admin.from("connections").upsert(
      { user_id: user.id, provider: "strava", external_id: t.athlete ? String(t.athlete.id) : null, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString(), scope: q.get("scope") },
      { onConflict: "user_id,provider" },
    );
    if (error) throw error;
    // Same Strava on another RunLetter account of yours: give it these tokens, the old pair is dead now.
    if (t.athlete) {
      await admin.from("connections").update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString(), last_sync_error: null })
        .eq("provider", "strava").eq("external_id", String(t.athlete.id)).neq("user_id", user.id);
    }
    track("connect_strava_completed", { athlete_id: t.athlete ? String(t.athlete.id) : null }, user.id);
    // Bring in the last three months and the athlete totals so the app is theirs on day one. Best effort.
    await syncAndNote(user.id, 90);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not connect Strava");
  }
  const res = NextResponse.redirect(new URL(`${back}?connected=strava`, publicOrigin(request)));
  res.cookies.delete("rl_strava_state");
  return res;
}
