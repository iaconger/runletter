// Calendar. This week's running from Strava first, then the month behind you and the weeks ahead, with anything
// you follow laid over it. Under the grid: runs from the people you follow, dragged onto any day.
import Link from "next/link";
import { Calendar } from "@/components/run/Calendar";
import { RunTray, trayRun } from "@/components/run/RunTray";
import { RouteSketch } from "@/components/run/RouteSketch";
import { getMyCalendar, getMyProfile, listExtras, listScheduled } from "@/lib/db/programs";
import { followedRuns } from "@/lib/db/explore";
import { buildWeeks, mondayOf } from "@/lib/calendar";
import { isConfigured } from "@/lib/supabase/server";
import { addDays, toISODate } from "@/lib/types";
import { distanceLabel, fmtDistance, fmtPace, paceLabel } from "@/lib/units";
import { sampleCompletedDays, sampleCreator, sampleProgram } from "@/lib/sample";
import { scheduleRunAction, unscheduleRunAction } from "../actions";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const RUNS = ["Run", "TrailRun", "VirtualRun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const hms = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")}m` : `${Math.round(s / 60)}m`);

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from: fromParam } = await searchParams;
  const today = toISODate(new Date());
  const configured = isConfigured();
  const me = configured ? await getMyProfile() : null;
  const units = me?.units ?? "km";
  let cal = configured ? await getMyCalendar(today) : null;
  // Five weeks back by default; ?from= pages further into your history, as far back as Strava gave us.
  const defaultFrom = mondayOf(toISODate(addDays(today, -35)));
  const from = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? mondayOf(fromParam) : defaultFrom;
  let sample = false;
  if (!configured) {
    sample = true;
    const start = toISODate(addDays(mondayOf(today), -14));
    cal = { program: sampleProgram, creator: sampleCreator, enrollmentId: "x", start, currentWeek: 3, doneIds: new Set(sampleProgram.days.filter((x) => x.week === 3 && sampleCompletedDays.has(x.day)).map((x) => x.id)), extras: [], sentWeeks: new Set([1, 2, 3]) };
  }
  const progEnd = cal ? toISODate(addDays(cal.start, cal.program.weeks * 7 - 1)) : null;
  const paging = from < defaultFrom;
  const to = paging ? toISODate(addDays(from, 55)) : progEnd && progEnd > today ? progEnd : toISODate(addDays(today, 13));
  const weeks = Math.ceil((addDays(to, 0).getTime() - addDays(from, 0).getTime()) / (7 * 86400000)) + 1;
  const extras = sample
    ? [{ id: "e1", date: toISODate(addDays(today, -2)), name: "Lunch loop", distanceM: 5200, durationS: 1700, sportType: "Run", avgPaceS: 327, elevationM: 40, avgHr: 148, kudos: 3, polyline: null, stravaActivityId: null }, { id: "e2", date: toISODate(addDays(today, -9)), name: "Sunday spin", distanceM: 32000, durationS: 4100, sportType: "Ride", avgPaceS: null, elevationM: 210, avgHr: 132, kudos: 5, polyline: null, stravaActivityId: null }]
    : me ? await listExtras(me.id, from, to) : [];
  const [scheduled, follows] = configured && me ? await Promise.all([listScheduled(from, to), followedRuns(12).catch(() => [])]) : [[], []];

  const rows = buildWeeks({
    from, weeks,
    program: cal ? { program: cal.program, start: cal.start } : null,
    doneIds: cal?.doneIds ?? new Set(), extras, scheduled, units,
    hrefFor: (dayId, _date, _w, _d, x) => (dayId ? `/app/run/${dayId}` : x && x.id.length > 4 ? `/app/log/${x.id}` : undefined),
  });
  const shown = rows;

  // This week from Strava, top of the page: what you actually did, before anything anyone planned for you.
  const weekStart = mondayOf(today);
  const thisWeek = extras.filter((x) => x.date >= weekStart).sort((a, b) => (a.date < b.date ? 1 : -1));
  const weekRuns = thisWeek.filter((x) => RUNS.includes(x.sportType));
  const weekM = weekRuns.reduce((a, x) => a + (x.distanceM ?? 0), 0);
  const weekS = thisWeek.reduce((a, x) => a + (x.durationS ?? 0), 0);

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1100px + 2 * var(--rl-gutter))", gap: "var(--rl-space-6)" }}>
      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted rl-kicker">{fmtDate(weekStart)} to {fmtDate(toISODate(addDays(weekStart, 6)))}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>This week</h1>
        </div>
        <div className="rl-row" style={{ gap: 6 }}>
          {weekRuns.length > 0 && <span className="rl-chip">{weekRuns.length} run{weekRuns.length === 1 ? "" : "s"} · {fmtDistance(weekM, units)} {distanceLabel(units)} · {hms(weekS)}</span>}
          {cal?.currentWeek && <span className="rl-chip">Week {cal.currentWeek}{cal.program.isLetter ? "" : ` of ${cal.program.weeks}`}</span>}
        </div>
      </div>

      {thisWeek.length > 0 ? (
        <ul className="rl-actlist">
          {thisWeek.map((x) => (
            <li key={x.id}>
              <Link href={`/app/log/${x.id}`}>
                {x.polyline ? <RouteSketch polyline={x.polyline} size={40} /> : <span className="rl-chip" style={{ justifySelf: "start" }}>{x.sportType.slice(0, 3)}</span>}
                <span className="rl-stack" style={{ gap: 0, minWidth: 0 }}>
                  <span className="nm">{x.name ?? x.sportType}</span>
                  <span className="sub">{fmtDate(x.date)}{x.durationS ? ` · ${hms(x.durationS)}` : ""}{x.avgHr ? ` · ${x.avgHr} bpm` : ""}</span>
                </span>
                <span className="rt">{x.distanceM ? `${fmtDistance(x.distanceM, units)} ${distanceLabel(units)}` : ""}{x.avgPaceS ? <><br />{fmtPace(x.avgPaceS, units)} {paceLabel(units)}</> : null}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rl-connect-prompt">
          <span className="t-body-sm">{me ? "Nothing from Strava this week yet." : "Connect Strava and your week fills itself in."}</span>
          <Link href="/app/you" className="rl-btn rl-btn-primary rl-btn-sm">{me ? "Sync" : "Connect"}</Link>
        </div>
      )}

      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
        <h2 className="t-title" style={{ margin: 0 }}>Your calendar</h2>
        <Calendar weeks={shown} today={today} currentWeek={cal?.currentWeek} schedule={me ? scheduleRunAction : undefined} unschedule={me ? unscheduleRunAction : undefined} />
        <div className="rl-between">
          <Link href={`/app/calendar?from=${toISODate(addDays(from, -28))}`} className="rl-btn rl-btn-ghost rl-btn-sm">← Earlier</Link>
          <span className="rl-help">Colour is the run type. A tick is done. The small numbers are your Strava.</span>
          {paging ? <Link href="/app/calendar" className="rl-btn rl-btn-ghost rl-btn-sm">Back to now →</Link> : <span />}
        </div>
      </section>

      {follows.length > 0 ? (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <h2 className="t-title" style={{ margin: 0 }}>Runs from people you follow</h2>
            <Link href="/app/explore" className="rl-help">More →</Link>
          </div>
          <RunTray runs={follows.map((r) => trayRun(r, r.creator.name))} weekStart={weekStart} schedule={scheduleRunAction} />
          <span className="rl-help">Drag one onto a day, or tap a day letter on the card.</span>
        </section>
      ) : (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <h2 className="t-title" style={{ margin: 0 }}>Runs to drag onto your week</h2>
          <div className="rl-connect-prompt">
            <span className="t-body-sm">Follow someone and their runs land here, ready to drop on a day.</span>
            <Link href="/app/explore" className="rl-btn rl-btn-primary rl-btn-sm">Find people</Link>
          </div>
        </section>
      )}
    </main>
  );
}
