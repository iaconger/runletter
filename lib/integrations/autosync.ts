import "server-only";
// Keep Strava fresh without a cron or a webhook: when a page loads and the last sync is stale, pull again
// after the response has gone out. The runner sees this page now and the new runs on the next one.
import { after } from "next/server";
import { syncAndNote } from "@/lib/integrations/strava";

export function refreshStravaInBackground(userId: string, lastSyncAt: string | null | undefined, maxAgeMin = 30) {
  const age = lastSyncAt ? Date.now() - new Date(lastSyncAt).getTime() : Number.POSITIVE_INFINITY;
  if (age < maxAgeMin * 60_000) return false;
  after(async () => { await syncAndNote(userId, 30); });
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
