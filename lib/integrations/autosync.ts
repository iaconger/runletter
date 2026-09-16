import "server-only";
// Keep Strava fresh without a cron or a webhook: when a page loads and the last sync is stale, pull again
// after the response has gone out. The runner sees this page now and the new runs on the next one.
import { after } from "next/server";
import { syncAndNote } from "@/lib/integrations/strava";

export function refreshStravaInBackground(userId: string, lastSyncAt: string | null | undefined, maxAgeMin = 30) {
  const age = lastSyncAt ? Date.now() - new Date(lastSyncAt).getTime() : Number.POSITIVE_INFINITY;
  if (age < maxAgeMin * 60_000) return false;
  // Everything already synced stays in the database; this only asks Strava for the days since the last pull
  // (with two days of overlap, so an activity edited after the fact is picked up).
  const days = Number.isFinite(age) ? Math.min(90, Math.max(3, Math.ceil(age / 86_400_000) + 2)) : 90;
  after(async () => { await syncAndNote(userId, days); });
  return true;
}

/** "3 minutes ago", for the line under the numbers. */
export function ago(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  if (mins < 2880) return `${Math.round(mins / 60)} hours ago`;
  return `${Math.round(mins / 1440)} days ago`;
}
