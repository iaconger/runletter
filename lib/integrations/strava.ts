import "server-only";
// Strava: OAuth connect, token refresh, and turning a finished activity into a completion.
// Strava cannot receive planned workouts; its whole job here is to keep the score.
// Docs: https://developers.strava.com/docs/authentication/ and /docs/webhooks/

import { createAdminClient } from "@/lib/supabase/admin";

const AUTH = "https://www.strava.com/oauth/authorize";
const TOKEN = "https://www.strava.com/oauth/token";
const API = "https://www.strava.com/api/v3";

export function stravaEnabled() {
  return !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export function stravaAuthorizeUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });
  return `${AUTH}?${q}`;
}

type TokenResponse = { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number } };

export async function stravaExchange(code: string): Promise<TokenResponse> {
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, code, grant_type: "authorization_code" }),
  });
  if (!r.ok) throw new Error(`Strava token exchange failed (${r.status})`);
  return r.json();
}

/** Returns a valid access token for the user, refreshing and persisting if it is about to expire. */
export async function stravaAccessToken(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: c } = await admin.from("connections").select("*").eq("user_id", userId).eq("provider", "strava").maybeSingle();
  if (!c?.access_token || !c.refresh_token) return null;
  const expires = c.expires_at ? new Date(c.expires_at).getTime() : 0;
  if (expires - Date.now() > 5 * 60 * 1000) return c.access_token;
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: c.refresh_token }),
  });
  if (!r.ok) return null;
  const t = (await r.json()) as TokenResponse;
  await admin.from("connections").update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString() }).eq("user_id", userId).eq("provider", "strava");
  return t.access_token;
}

type Activity = { id: number; type: string; sport_type?: string; start_date_local: string; distance: number; moving_time: number; average_speed: number };

/**
 * A new Strava activity arrived for an athlete. If it is a run, find the program day that runner had on that
 * date (enrollments, including the creator's own) and record a completion. Idempotent per activity.
 */
export async function recordStravaActivity(athleteId: string, activityId: number): Promise<"done" | "not_a_run" | "no_day" | "no_user"> {
  const admin = createAdminClient();
  if (!admin) return "no_user";
  const { data: c } = await admin.from("connections").select("user_id").eq("provider", "strava").eq("external_id", athleteId).maybeSingle();
  if (!c) return "no_user";
  const token = await stravaAccessToken(c.user_id);
  if (!token) return "no_user";

  const r = await fetch(`${API}/activities/${activityId}`, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Strava activity fetch failed (${r.status})`);
  const a = (await r.json()) as Activity;
  const isRun = a.type === "Run" || a.sport_type === "Run" || a.sport_type === "TrailRun" || a.sport_type === "VirtualRun";
  if (!isRun) return "not_a_run";

  const date = a.start_date_local.slice(0, 10);
  const { data: rows } = await admin.rpc("today_for_follower", { p_follower_id: c.user_id, p_date: date });
  const hit = rows?.find((x) => x.program_day_id);
  if (!hit?.program_day_id) return "no_day";

  const avgPace = a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null;
  await admin.from("completions").upsert(
    {
      enrollment_id: hit.enrollment_id,
      program_day_id: hit.program_day_id,
      source: "strava",
      strava_activity_id: String(a.id),
      distance_m: Math.round(a.distance),
      duration_s: a.moving_time,
      avg_pace_s: avgPace,
      completed_at: new Date(a.start_date_local).toISOString(),
    },
    { onConflict: "enrollment_id,program_day_id" },
  );
  return "done";
}
