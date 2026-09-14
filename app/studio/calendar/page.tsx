// Creator calendar. Your Letter (and plans) week by week with dates, what's sent, and what your own watch logged.
// Every day opens in the editor on that day.
import Link from "next/link";
import { Calendar } from "@/components/run/Calendar";
import { getMyProfile, listIssues, listMyPrograms, listExtras } from "@/lib/db/programs";
import { buildWeeks, mondayOf } from "@/lib/calendar";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { addDays, toISODate, weekOfDate } from "@/lib/types";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function StudioCalendar({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const today = toISODate(new Date());
  const [me, programs] = isConfigured() ? await Promise.all([getMyProfile(), listMyPrograms()]) : [null, []];
  const letter = programs.find((x) => x.isLetter) ?? null;
  const program = (p ? programs.find((x) => x.id === p) : null) ?? letter ?? programs[0] ?? null;
  if (!me || !program) {
    return (
      <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-5)" }}>
        <h1 className="t-display-lg" style={{ margin: 0 }}>Calendar</h1>
        <p className="c-secondary" style={{ margin: 0 }}>Start your Letter and the weeks show up here with dates.</p>
        <Link href="/studio" className="rl-btn rl-btn-primary" style={{ alignSelf: "flex-start" }}>Start your Letter</Link>
      </main>
    );
  }
  const start = program.fixedStartDate ?? today;
  const currentWeek = program.fixedStartDate ? weekOfDate(program.fixedStartDate, new Date(), program.weeks) : null;
  const issues = program.isLetter ? await listIssues(program.id) : [];
  const supabase = await createClient();
  const { data: comps } = await supabase.from("completions").select("program_day_id, enrollments!inner(follower_id)").eq("enrollments.follower_id", me.id);
  const from = mondayOf(start < toISODate(addDays(today, -28)) ? start : toISODate(addDays(today, -28)));
  const end = toISODate(addDays(start, program.weeks * 7 - 1));
  const nWeeks = Math.ceil((addDays(end, 0).getTime() - addDays(from, 0).getTime()) / (7 * 86400000)) + 1;
  const extras = await listExtras(me.id, from, end);
  const weeks = buildWeeks({
    from, weeks: nWeeks, program: { program, start }, doneIds: new Set((comps ?? []).map((c) => c.program_day_id)), extras,
    hrefFor: (_id, _date, week, day) => (week ? `/studio/programs/${program.id}?week=${week}&day=${day}` : undefined),
    stampFor: (w) => { const i = issues.find((x) => x.week === w); return program.isLetter ? (i?.sentAt ? "sent" : i?.scheduledFor ? "scheduled" : "draft") : undefined; },
  });
  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1100px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">{program.isLetter ? "Your Letter" : "Plan"}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{program.title}</h1>
        </div>
        <div className="rl-row" style={{ gap: 6 }}>
          {programs.length > 1 && programs.map((x) => (
            <Link key={x.id} href={`/studio/calendar?p=${x.id}`} className={`rl-chip ${x.id === program.id ? "rl-chip-on" : ""}`}>{x.isLetter ? "Letter" : x.title}</Link>
          ))}
          <Link href={`/studio/programs/${program.id}`} className="rl-btn rl-btn-primary rl-btn-sm">Edit</Link>
        </div>
      </div>
      <Calendar weeks={weeks} today={today} currentWeek={currentWeek} />
      <span className="rl-help">Tap a day to edit it. A tick is a run you did yourself. <em>+km</em> is from your own Strava.</span>
    </main>
  );
}
