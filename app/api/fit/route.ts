// GET /api/fit?program=<id>&week=3&day=4  -> .FIT structured workout download.
// Phase 1: serves the sample program only. Phase 2: look the day up in Supabase and check access.
import { NextResponse, type NextRequest } from "next/server";
import { encodeWorkout, fitFilename } from "@/lib/fit/encode";
import { dayTitle } from "@/components/run/RunPieces";
import { sampleProgram } from "@/lib/sample";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const week = Number(q.get("week") ?? 0);
  const day = Number(q.get("day") ?? 0);
  const program = sampleProgram; // TODO(phase 2): fetch by q.get("program") with RLS
  const pd = program.days.find((d) => d.week === week && d.day === day);
  if (!pd) return NextResponse.json({ error: "No such day" }, { status: 404 });
  if (pd.kind !== "run") return NextResponse.json({ error: "Not a run day" }, { status: 400 });

  const bytes = encodeWorkout(pd, { name: dayTitle(pd) });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/vnd.ant.fit",
      "content-disposition": `attachment; filename="${fitFilename(program.title, pd)}"`,
      "cache-control": "no-store",
    },
  });
}
