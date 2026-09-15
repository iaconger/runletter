import "server-only";
// Strava: OAuth connect, token refresh, and turning a finished activity into a completion.
// Strava cannot receive planned workouts; its job here is to keep the score and to make the app feel like
// the runner's from the first sync: every activity, the totals, the profile.
// Docs: https://developers.strava.com/docs/authentication/ and /docs/webhooks/

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";
import { track } from "@/lib/analytics";

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

type Activity = {
  id: number; name?: string; type: string; sport_type?: string; start_date_local: string; start_date?: string;
  distance: number; moving_time: number; average_speed: number; total_elevation_gain?: number;
  average_heartrate?: number; max_heartrate?: number; kudos_count?: number; location_city?: string | null;
  map?: { summary_polyline?: string | null };
};
const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const isRunActivity = (a: Activity) => a.type === "Run" || RUN_TYPES.has(a.sport_type ?? "");

export type StravaStats = {
  recent: { runs: number; distanceM: number; timeS: number; elevationM: number };
  ytd: { runs: number; distanceM: number; timeS: number; elevationM: number };
  all: { runs: number; distanceM: number; timeS: number; elevationM: number };
  rides?: { ytdDistanceM: number; ytdCount: number };
  syncedAt: string;
};

/** Athlete totals (last four weeks, this year, all time) plus the profile, saved on the runner's profile. */
export async function syncStravaAthlete(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const token = await stravaAccessToken(userId);
  if (!token) return;
  const me = await fetch(`${API}/athlete`, { headers: { authorization: `Bearer ${token}` } });
  if (!me.ok) return;
  const a = (await me.json()) as { id: number; firstname?: string; lastname?: string; profile?: string; city?: string; bio?: string };
  const st = await fetch(`${API}/athletes/${a.id}/stats`, { headers: { authorization: `Bearer ${token}` } });
  type Tot = { count: number; distance: number; moving_time: number; elevation_gain: number };
  const tot = (t?: Tot) => ({ runs: t?.count ?? 0, distanceM: Math.round(t?.distance ?? 0), timeS: Math.round(t?.moving_time ?? 0), elevationM: Math.round(t?.elevation_gain ?? 0) });
  let stats: StravaStats | null = null;
  if (st.ok) {
    const x = (await st.json()) as { recent_run_totals?: Tot; ytd_run_totals?: Tot; all_run_totals?: Tot; ytd_ride_totals?: Tot };
    stats = { recent: tot(x.recent_run_totals), ytd: tot(x.ytd_run_totals), all: tot(x.all_run_totals), rides: x.ytd_ride_totals ? { ytdDistanceM: Math.round(x.ytd_ride_totals.distance), ytdCount: x.ytd_ride_totals.count } : undefined, syncedAt: new Date().toISOString() };
  }
  // Prefill what the runner has not set: name, photo, bio. Never overwrite something they wrote.
  const { data: prof } = await admin.from("profiles").select("display_name, avatar_url, bio").eq("id", userId).maybeSingle();
  const patch: { strava_synced_at: string; strava_stats?: StravaStats; display_name?: string; avatar_url?: string; bio?: string } = { strava_synced_at: new Date().toISOString() };
  if (stats) patch.strava_stats = stats;
  if (prof && !prof.display_name?.trim() && (a.firstname || a.lastname)) patch.display_name = [a.firstname, a.lastname].filter(Boolean).join(" ");
  if (prof && !prof.avatar_url && a.profile && !/avatar\/athlete\/large/.test(a.profile)) patch.avatar_url = a.profile;
  if (prof && !prof.bio?.trim() && a.bio) patch.bio = a.bio.slice(0, 200);
  await admin.from("profiles").update({ ...patch, strava_stats: patch.strava_stats as unknown as Json }).eq("id", userId);
}

/**
 * A new Strava activity arrived for an athlete. If it is a run, find the program day that runner had on that
 * date (enrollments, including the creator's own) and record a completion. Idempotent per activity.
 */
export async function recordStravaActivity(athleteId: string, activityId: number): Promise<"done" | "extra" | "not_a_run" | "no_user"> {
  const admin = createAdminClient();
  if (!admin) return "no_user";
  // One athlete can be connected to more than one RunLetter account (a creator account and a runner account,
  // say): record the activity for every one of them.
  const { data: rows } = await admin.from("connections").select("user_id").eq("provider", "strava").eq("external_id", athleteId);
  if (!rows?.length) return "no_user";
  let out: "done" | "extra" | "not_a_run" | "no_user" = "no_user";
  for (const c of rows) {
    const token = await stravaAccessToken(c.user_id);
    if (!token) continue;
    const r = await fetch(`${API}/activities/${activityId}`, { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Strava activity fetch failed (${r.status})`);
    const a = (await r.json()) as Activity;
    const res = await recordActivity(c.user_id, a);
    if (res === "done" || out === "no_user") out = res;
  }
  return out;
}

/** Pull the athlete's last N days from Strava and record each run. Used right after connecting and on demand. */
export async function syncRecentStrava(userId: string, days = 90): Promise<{ done: number; extra: number; skipped: number }> {
  const out = { done: 0, extra: 0, skipped: 0 };
  const token = await stravaAccessToken(userId);
  if (!token) return out;
  const after = Math.floor((Date.now() - days * 86400000) / 1000);
  const list: Activity[] = [];
  for (let page = 1; page <= 3; page++) {
    const r = await fetch(`${API}/athlete/activities?after=${after}&per_page=100&page=${page}`, { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Strava activities fetch failed (${r.status})`);
    const chunk = (await r.json()) as Activity[];
    list.push(...chunk);
    if (chunk.length < 100) break;
  }
  try { await syncStravaAthlete(userId); } catch (e) { console.error("strava athlete", e); }
  for (const a of list) {
    const res = await recordActivity(userId, a);
    if (res === "done") out.done++;
    else if (res === "extra") out.extra++;
    else out.skipped++;
  }
  return out;
}

async function recordActivity(userId: string, a: Activity): Promise<"done" | "extra" | "not_a_run" | "no_user"> {
  const admin = createAdminClient();
  if (!admin) return "no_user";
  const c = { user_id: userId };
  const isRun = isRunActivity(a);
  const date = a.start_date_local.slice(0, 10);
  const avgPace = a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null;
  const extraRow = {
    user_id: c.user_id, run_date: date, source: "strava" as const, strava_activity_id: String(a.id), name: a.name ?? null,
    distance_m: Math.round(a.distance), duration_s: a.moving_time, avg_pace_s: isRun ? avgPace : null,
    sport_type: a.sport_type ?? a.type, start_time: a.start_date ?? null, elevation_m: a.total_elevation_gain != null ? Math.round(a.total_elevation_gain) : null,
    avg_hr: a.average_heartrate != null ? Math.round(a.average_heartrate) : null, max_hr: a.max_heartrate != null ? Math.round(a.max_heartrate) : null,
    kudos: a.kudos_count ?? null, polyline: a.map?.summary_polyline ?? null, city: a.location_city ?? null,
  };
  // Everything that isn't a run (rides, walks, swims, gym) is kept as an activity; it never completes a planned run.
  if (!isRun) {
    await admin.from("extra_runs").upsert(extraRow, { onConflict: "strava_activity_id" });
    return "not_a_run";
  }
  const { data: rows } = await admin.rpc("today_for_follower", { p_follower_id: c.user_id, p_date: date });
  const hit = rows?.find((x) => x.program_day_id);

  // No planned run that day, or the day is already done by another activity: keep it as an extra.
  const { data: existing } = hit?.program_day_id
    ? await admin.from("completions").select("strava_activity_id").eq("enrollment_id", hit.enrollment_id).eq("program_day_id", hit.program_day_id).maybeSingle()
    : { data: null };
  const isRestOrCross = hit?.program_day_id ? (await admin.from("program_days").select("kind").eq("id", hit.program_day_id).single()).data?.kind !== "run" : true;
  if (!hit?.program_day_id || isRestOrCross || (existing && existing.strava_activity_id && existing.strava_activity_id !== String(a.id))) {
    await admin.from("extra_runs").upsert(
      { user_id: c.user_id, run_date: date, source: "strava", strava_activity_id: String(a.id), name: a.name ?? null, distance_m: Math.round(a.distance), duration_s: a.moving_time, avg_pace_s: avgPace },
      { onConflict: "strava_activity_id" },
    );
    track("extra_run_synced", { distance_m: Math.round(a.distance), duration_s: a.moving_time }, c.user_id);
    return "extra";
  }

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
  track("run_marked_done", { source: "strava", program_day_id: hit.program_day_id }, c.user_id);
  return "done";
}
