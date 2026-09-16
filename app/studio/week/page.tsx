// Your week, and the weeks after it. Seven days to write, one tap each, plus a rail of the weeks around
// this one so a creator can plan a block ahead without leaving the screen they write in.
import Link from "next/link";
import { WeekBuilder, type MyRun } from "@/components/studio/WeekBuilder";
import { getMyLetter, getMyProfile, getProgram, listExtras } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { addDays, dayDurationS, toISODate, weekOfDate } from "@/lib/types";
import { clearDayAction, noteDayAction, repeatWeekAction, saveDaySpecAction, setShapeAction, stretchDayAction, useMyRunAction } from "@/app/studio/actions";

export const metadata = { title: "Your week" };
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const RUNS = ["Run", "TrailRun", "VirtualRun"];

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const today = toISODate(new Date());
  const [me, letter] = isConfigured() ? await Promise.all([getMyProfile(), getMyLetter()]) : [null, null];
  if (!me || !letter) {
    return (
      <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-5)" }}>
        <h1 className="t-display-lg" style={{ margin: 0 }}>Your week</h1>
        <p className="c-secondary" style={{ margin: 0 }}>Open your week first and this becomes the only screen you need.</p>
        <Link href="/studio" className="rl-btn rl-btn-primary" style={{ alignSelf: "flex-start" }}>Open my week</Link>
      </main>
    );
  }
  const program = (await getProgram(letter.id)) ?? letter;
  const start = program.fixedStartDate;
  const thisWeek = (start ? weekOfDate(start, new Date(), Math.max(program.weeks, 520)) : 1) ?? 1;
  const { w } = await searchParams;
  const week = Math.max(1, Number(w) || thisWeek || 1);
  // A Letter runs as long as the creator keeps writing it: growing the week count is just bookkeeping.
  const weekStart = start ? toISODate(addDays(start, (week - 1) * 7)) : today;
  const dates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));
  const days = program.days.filter((d) => d.week === week).sort((a, b) => a.day - b.day);

  // Four weeks behind, twelve ahead: enough to see a block take shape, in the screen they write in.
  const first = Math.max(1, thisWeek - 3);
  const rail = Array.from({ length: 16 }, (_, i) => {
    const n = first + i;
    const ws = start ? toISODate(addDays(start, (n - 1) * 7)) : today;
    const ds = program.days.filter((d) => d.week === n);
    const runs = ds.filter((d) => d.kind === "run");
    return {
      n, start: ws,
      written: ds.length,
      runs: runs.length,
      mins: Math.round(runs.reduce((a, d) => a + dayDurationS(d), 0) / 60),
    };
  });

  // The creator's own runs inside this week, offered as one-tap material.
  const extras = await listExtras(me.id, dates[0]!, dates[6]!);
  const myRuns: MyRun[] = extras
    .filter((x) => RUNS.includes(x.sportType))
    .map((x) => ({ id: x.id, day: dates.indexOf(x.date) + 1, name: x.name, distanceM: x.distanceM, durationS: x.durationS }))
    .filter((r) => r.day >= 1);

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(820px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted rl-kicker">{fmt(dates[0]!)} to {fmt(dates[6]!)}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{week === thisWeek ? "This week" : `Week ${week}`}</h1>
        </div>
        <div className="rl-row" style={{ gap: 6 }}>
          <Link href={`/studio/week?w=${Math.max(1, week - 1)}`} className="rl-btn rl-btn-ghost rl-btn-sm" aria-disabled={week <= 1}>← Back</Link>
          <Link href={`/studio/week?w=${week + 1}`} className="rl-btn rl-btn-ghost rl-btn-sm">Forward →</Link>
        </div>
      </div>

      <nav className="rl-weekrail" aria-label="Weeks">
        {rail.map((r) => (
          <Link key={r.n} href={`/studio/week?w=${r.n}`} data-on={r.n === week ? "true" : undefined} data-now={r.n === thisWeek ? "true" : undefined} data-empty={r.written === 0 ? "true" : undefined}>
            <span className="wk">{r.n === thisWeek ? "This week" : `Week ${r.n}`}</span>
            <span className="dt">{fmt(r.start)}</span>
            <span className="fill" aria-hidden>
              {Array.from({ length: 7 }, (_, d) => {
                const day = program.days.find((x) => x.week === r.n && x.day === d + 1) ?? null;
                return <i key={d} data-run={day ? (day.kind === "run" ? day.runType ?? "easy" : day.kind) : undefined} />;
              })}
            </span>
            <span className="sum">{r.written === 0 ? "empty" : `${r.runs} run${r.runs === 1 ? "" : "s"}${r.mins ? ` · ${r.mins >= 60 ? `${Math.floor(r.mins / 60)}h${r.mins % 60 ? ` ${r.mins % 60}m` : ""}` : `${r.mins}m`}` : ""}`}</span>
          </Link>
        ))}
      </nav>

      <WeekBuilder
        programId={program.id}
        week={week}
        days={days}
        myRuns={myRuns}
        dates={dates}
        units={me.units}
        canRepeat={week > 1}
        actions={{
          setShape: setShapeAction,
          stretch: stretchDayAction,
          note: noteDayAction,
          useMyRun: useMyRunAction,
          saveSpec: saveDaySpecAction,
          clearDay: clearDayAction,
          repeatWeek: repeatWeekAction,
        }}
      />
    </main>
  );
}
