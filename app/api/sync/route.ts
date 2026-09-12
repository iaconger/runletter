// POST /api/sync  (header: x-sync-secret) -> drain the workout push queue. Hit it from a Render cron every
// few minutes, or by hand. Idempotent.
import { NextResponse, type NextRequest } from "next/server";
import { processQueue } from "@/lib/db/sync";

export async function POST(request: NextRequest) {
  if (!process.env.SYNC_SECRET || request.headers.get("x-sync-secret") !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await processQueue(100);
  return NextResponse.json(result);
}
