// Calendar. The past month always, with everything Strava logged; the program you follow laid over it from the
// day you joined; the weeks ahead. Every run opens.
import Link from "next/link";
import { Calendar } from "@/components/run/Calendar";
import { getMyCalendar, getMyProfile, listExtras } from "@/lib/db/programs";
import { buildWeeks, mondayOf } from "@/lib/calendar";
import { isConfigured } from "@/lib/supabase/server";
import { addDays, toISODate } from "@/lib/types";
import { distanceLabel, fmtDistance } from "@/lib/units";
import { sampleCompletedDays, sampleCreator, sampleProgram } from "@/lib/sample";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const today = toISODate(new Date());
  const configured = isConfigured();
  const me = configured ? await getMyProfile() : null;
  const units = me?.units ?? "km";
  let cal = configured ? await getMyCalendar(today) : null;
  // Always the past ~5 weeks, then the program's remaining weeks (or two weeks ahead).
  const from = mondayOf(toISODate(addDays(today, -35)));
  let sample = false;
  if (!configured) {
    sample = true;
    const start = toISODate(addDays(mondayOf(today), -14));
    cal = { program: sampleProgram, creator: sampleCreator, enrollmentId: "x", start, currentWeek: 3, doneIds: new Set(sampleProgram.days.filter((x) => x.week === 3 && sampleCompletedDays.has(x.day)).map((x) => x.id)), extras: [], sentWeeks: new Set([1, 2, 3]) };
  }
  const progEnd = cal ? toISODate(addDays(cal.start, cal.program.weeks * 7 - 1)) : null;
  const to = progEnd && progEnd > today ? progEnd : toISODate(addDays(today, 13));
  const weeks = Math.ceil((addDays(to, 0).getTime() - addDays(from, 0).getTime()) / (7 * 86400000)) + 1;
  const extras = sample
    ? [{ id: "e1", date: toISODate(addDays(today, -2)), name: "Lunch loop", distanceM: 5200, durationS: 1700, sportType: "Run", avgPaceS: 327, elevationM: 40, avgHr: 148, kudos: 3, polyline: null, stravaActivityId: null }, { id: "e2", date: toISODate(addDays(today, -9)), name: "Sunday spin", distanceM: 32000, durationS: 4100, sportType: "Ride", avgPaceS: null, elevationM: 210, avgHr: 132, kudos: 5, polyline: null, stravaActivityId: null }]
    : me ? await listExtras(me.id, from, to) : [];
  const rows = buildWeeks({
    from, weeks,
    program: cal ? { program: cal.program, start: cal.start } : null,
    doneIds: cal?.doneIds ?? new Set(), extras, sentWeeks: cal?.sentWeeks, hideUnsent: true, units,
    hrefFor: (dayId, _date, _w, _d, x) => (dayId ? `/app/run/${dayId}` : x && x.id.length > 4 ? `/app/log/${x.id}` : undefined),
    stampFor: (w) => (cal?.program.isLetter ? (cal.sentWeeks.has(w) ? "sent" : "draft") : undefined),
  });
  // A Letter's unsent future weeks are noise: keep past, current, next.
  const shown = rows.filter((w) => !(cal?.program.isLetter && w.week > 0 && !cal.sentWeeks.has(w.week) && w.week !== (cal.currentWeek ?? 0) + 1));
  const monthAgo = toISODate(addDays(today, -30));
  const recent = extras.filter((x) => x.date >= monthAgo);
  const totalM = recent.reduce((a, x) => a + (x.distanceM ?? 0), 0);
  const runs = recent.filter((x) => ["Run", "TrailRun", "VirtualRun"].includes(x.sportType)).length;

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1100px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">{cal ? cal.creator.displayName : "Your running"}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{cal ? cal.program.title : "Calendar"}</h1>
        </div>
        <div className="rl-row" style={{ gap: 6 }}>
          {recent.length > 0 && <span className="rl-chip">Last 30 days · {runs} run{runs === 1 ? "" : "s"} · {fmtDistance(totalM, units, { decimals: 0 })} {distanceLabel(units)}</span>}
          {cal?.currentWeek && <span className="rl-chip">Week {cal.currentWeek}{cal.program.isLetter ? "" : ` of ${cal.program.weeks}`}</span>}
        </div>
      </div>
      {!cal && (
        <div className="rl-connect-prompt">
          <span className="t-body-sm">{me && recent.length === 0 ? "Connect Strava and the last three months land here." : "Follow someone and their weeks land on top."}</span>
          <Link href={me && recent.length === 0 ? "/app/you" : "/app/explore"} className="rl-btn rl-btn-primary rl-btn-sm">{me && recent.length === 0 ? "Connect" : "Explore"}</Link>
        </div>
      )}
      <Calendar weeks={shown} today={today} currentWeek={cal?.currentWeek} />
      <span className="rl-help">Colour is the run type. A tick is done. The small numbers and the other sports are from your Strava.</span>
    </main>
  );
}
