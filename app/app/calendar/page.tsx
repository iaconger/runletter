// Calendar. The whole program from the day you joined: planned, done, and what you ran off plan. Every run opens.
import Link from "next/link";
import { Calendar } from "@/components/run/Calendar";
import { getMyCalendar } from "@/lib/db/programs";
import { buildWeeks } from "@/lib/calendar";
import { isConfigured } from "@/lib/supabase/server";
import { addDays, toISODate } from "@/lib/types";
import { sampleCompletedDays, sampleCreator, sampleProgram } from "@/lib/sample";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const today = toISODate(new Date());
  const configured = isConfigured();
  let cal = configured ? await getMyCalendar(today) : null;
  if (!configured) {
    // Preview build without Supabase: the example plan, started so that week 3 is this week.
    const d = new Date(); const monday = toISODate(addDays(today, -((d.getDay() + 6) % 7)));
    const start = toISODate(addDays(monday, -14));
    cal = { program: sampleProgram, creator: sampleCreator, enrollmentId: "x", start, currentWeek: 3, doneIds: new Set(sampleProgram.days.filter((x) => x.week === 3 && sampleCompletedDays.has(x.day)).map((x) => x.id)), extras: [{ id: "e1", date: toISODate(addDays(monday, 2)), name: "Lunch loop", distanceM: 5200, durationS: 1700 }], sentWeeks: new Set([1, 2, 3]) };
  }
  if (!cal) {
    return (
      <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-5)" }}>
        <h1 className="t-display-lg" style={{ margin: 0 }}>Calendar</h1>
        <p className="c-secondary" style={{ margin: 0 }}>Follow someone and their weeks land here.</p>
        <Link href="/app/explore" className="rl-btn rl-btn-primary" style={{ alignSelf: "flex-start" }}>Explore creators</Link>
      </main>
    );
  }
  const weeks = buildWeeks({
    program: cal.program, start: cal.start, doneIds: cal.doneIds, extras: cal.extras, sentWeeks: cal.sentWeeks, hideUnsent: true,
    hrefFor: (dayId) => (dayId ? `/app/run/${dayId}` : undefined),
    stampFor: (w) => (cal.program.isLetter ? (cal.sentWeeks.has(w) ? "sent" : "draft") : undefined),
  });
  const shown = cal.program.isLetter ? weeks.filter((w) => cal.sentWeeks.has(w.week) || w.week === cal.currentWeek || w.week === (cal.currentWeek ?? 0) + 1) : weeks;
  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: 1100, gap: "var(--rl-space-5)" }}>
      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">{cal.creator.displayName}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{cal.program.title}</h1>
        </div>
        {cal.currentWeek && <span className="rl-chip">Week {cal.currentWeek}{cal.program.isLetter ? "" : ` of ${cal.program.weeks}`}</span>}
      </div>
      <Calendar weeks={shown} today={today} currentWeek={cal.currentWeek} />
      <span className="rl-help">Colour is the run type. A tick is done. <em>+km</em> is a run you did off plan, from Strava.</span>
    </main>
  );
}
