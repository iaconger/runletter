// POST /api/sync  (header: x-sync-secret) -> drain the workout push queue and refresh stale Strava
// connections. Hit it from a cron every few minutes, or by hand. Idempotent.
import { NextResponse, type NextRequest } from "next/server";
import { processQueue } from "@/lib/db/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAndNote } from "@/lib/integrations/strava";

export async function POST(request: NextRequest) {
  if (!process.env.SYNC_SECRET || request.headers.get("x-sync-secret") !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await processQueue(100);
  const admin = createAdminClient();
  const stale = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data: conns } = admin
    ? await admin.from("connections").select("user_id, last_sync_at").eq("provider", "strava").or(`last_sync_at.is.null,last_sync_at.lt.${stale}`).limit(50)
    : { data: [] };
  const strava: Record<string, number> = { checked: (conns ?? []).length, synced: 0, failed: 0 };
  for (const c of conns ?? []) {
    const r = await syncAndNote(c.user_id, 14);
    if (r.ok) strava.synced!++; else strava.failed!++;
  }
  return NextResponse.json({ ...result, strava });
}
