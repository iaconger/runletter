// A run you did. The numbers, where they came from, and the planned run it counted for if there was one.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyRun, getRunDay } from "@/lib/db/programs";
import { dayTitle } from "@/components/run/RunPieces";
import { getMyProfile } from "@/lib/db/programs";
import { climbLabel, distanceLabel, fmtClimb, fmtDistance, fmtPace, paceLabel } from "@/lib/units";
import { isConfigured } from "@/lib/supabase/server";
import { RUN_TYPE_LABEL } from "@/lib/types";
import { RouteSketch } from "@/components/run/RouteSketch";

export const dynamic = "force-dynamic";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y!, m! - 1, d!); return `${DAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`; };
const hms = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`; };

export default async function LoggedRun({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = isConfigured() ? await getMyRun(id) : null;
  const me = isConfigured() ? await getMyProfile() : null;
  const units = me?.units ?? "km";
  if (!run) notFound();
  const planned = run.programDayId ? await getRunDay(run.programDayId) : null;

  const isRun = ["Run", "TrailRun", "VirtualRun"].includes(run.sportType);
  const type = planned?.day.runType ? RUN_TYPE_LABEL[planned.day.runType] : isRun ? null : run.sportType.replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <Link href="/app" className="rl-help" style={{ alignSelf: "flex-start" }}>← Today</Link>

      <article className="rl-today" data-run={planned?.day.runType ?? "easy"}>
        <div className="top">
          <span className="kicker">{longDate(run.date)}{type ? ` · ${type}` : ""}{run.planned ? " · done" : isRun ? " · off plan" : ""}</span>
          <h1>{planned ? dayTitle(planned.day) : run.title}</h1>
          {planned && <span className="facts">{planned.creator.displayName} · week {planned.day.week}</span>}
        </div>
        <div className="body">
          <span className="rl-help">{run.source === "strava" ? "Tracked with Strava" : "Marked by hand"}</span>
          <div className="rl-facts">
            {run.durationS != null && <div><span className="k">Duration</span><span className="v">{hms(run.durationS)}</span></div>}
            {run.distanceM != null && <div><span className="k">Distance</span><span className="v">{fmtDistance(run.distanceM, units)} {distanceLabel(units)}</span></div>}
            {run.avgPaceS != null && <div><span className="k">Average pace</span><span className="v">{fmtPace(run.avgPaceS, units)} {paceLabel(units)}</span></div>}
            {run.avgHr ? <div><span className="k">Average heart rate</span><span className="v">{run.avgHr} bpm</span></div> : null}
            {run.elevationM ? <div><span className="k">Climbed</span><span className="v">{fmtClimb(run.elevationM, units)} {climbLabel(units)}</span></div> : null}
            {run.kudos ? <div><span className="k">Kudos</span><span className="v">{run.kudos}</span></div> : null}
          </div>
          {run.polyline && (
            <div className="rl-routebox">
              <RouteSketch polyline={run.polyline} size={220} />
            </div>
          )}
          <div className="rl-row" style={{ alignItems: "center" }}>
            {run.stravaActivityId && (
              <a className="rl-btn rl-btn-secondary rl-btn-sm" href={`https://www.strava.com/activities/${run.stravaActivityId}`} target="_blank" rel="noreferrer">View on Strava</a>
            )}
            {planned && <Link className="rl-btn rl-btn-ghost rl-btn-sm" href={`/app/run/${planned.day.id}`}>The planned run</Link>}
          </div>
          {planned?.day.note && <blockquote className="rl-note" style={{ margin: 0 }}><q>{planned.day.note}</q></blockquote>}
        </div>
      </article>
    </main>
  );
}
