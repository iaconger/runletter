// GET /api/fit?program=<id>&week=3&day=4  -> .FIT structured workout download.
// Reads through Supabase with the caller's session, so RLS decides: the creator, a subscriber or a buyer get the
// file; anyone else gets 404. The example program is always available so the marketing pages can demo it.
import { NextResponse, type NextRequest } from "next/server";
import { encodeWorkout, fitFilename } from "@/lib/fit/encode";
import { dayTitle } from "@/components/run/RunPieces";
import { getProgram } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { sampleProgram } from "@/lib/sample";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const id = q.get("program") ?? sampleProgram.id;
  const week = Number(q.get("week") ?? 0);
  const day = Number(q.get("day") ?? 0);

  const program = id === sampleProgram.id ? sampleProgram : isConfigured() ? await getProgram(id) : null;
  if (!program) return NextResponse.json({ error: "No such program" }, { status: 404 });
  const pd = program.days.find((d) => d.week === week && d.day === day);
  if (!pd) return NextResponse.json({ error: "No such day" }, { status: 404 });
  if (pd.kind !== "run" || pd.blocks.length === 0) return NextResponse.json({ error: "Not a run day" }, { status: 400 });

  const bytes = encodeWorkout(pd, { name: dayTitle(pd) });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/vnd.ant.fit",
      "content-disposition": `attachment; filename="${fitFilename(program.title, pd)}"`,
      "cache-control": "no-store",
    },
  });
}
