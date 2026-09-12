// Strava webhook. GET answers the subscription handshake; POST receives activity events.
// Create the subscription once (see 03-build/setup.md). Strava expects a 200 within two seconds, so the
// activity fetch and completion write happen after we respond.
import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { recordStravaActivity } from "@/lib/integrations/strava";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": q.get("hub.challenge") });
  }
  return NextResponse.json({ error: "bad verify token" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const ev = (await request.json().catch(() => null)) as { object_type?: string; aspect_type?: string; object_id?: number; owner_id?: number } | null;
  if (ev?.object_type === "activity" && (ev.aspect_type === "create" || ev.aspect_type === "update") && ev.object_id && ev.owner_id) {
    const { object_id, owner_id } = ev;
    after(async () => {
      try {
        await recordStravaActivity(String(owner_id), object_id);
      } catch (e) {
        console.error("strava webhook", e);
      }
    });
  }
  return NextResponse.json({ ok: true });
}
