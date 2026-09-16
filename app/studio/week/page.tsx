// Your week. The one screen a creator needs: seven days, one tap each, live as it is written.
import Link from "next/link";
import { WeekBuilder, type MyRun } from "@/components/studio/WeekBuilder";
import { getMyLetter, getMyProfile, getProgram, listExtras } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { addDays, toISODate, weekOfDate } from "@/lib/types";
import { clearDayAction, noteDayAction, repeatWeekAction, setShapeAction, stretchDayAction, useMyRunAction } from "@/app/studio/actions";

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
  const thisWeek = start ? weekOfDate(start, new Date(), Math.max(program.weeks, 520)) : 1;
  const { w } = await searchParams;
  const week = Math.max(1, Number(w) || thisWeek || 1);
  // A Letter runs as long as the creator keeps writing it: growing the week count is just bookkeeping.
  const weekStart = start ? toISODate(addDays(start, (week - 1) * 7)) : today;
  const dates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));
  const days = program.days.filter((d) => d.week === week).sort((a, b) => a.day - b.day);

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
          <Link href={`/studio/week?w=${week - 1}`} className="rl-btn rl-btn-ghost rl-btn-sm" aria-disabled={week <= 1}>← Last week</Link>
          <Link href={`/studio/week?w=${week + 1}`} className="rl-btn rl-btn-ghost rl-btn-sm">Next week →</Link>
        </div>
      </div>

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
          clearDay: clearDayAction,
          repeatWeek: repeatWeekAction,
        }}
      />
    </main>
  );
}
