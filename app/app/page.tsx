// Today. The screen the whole product is built around: one run, the creator's note, the structure, two actions.
// Phase 1 renders the sample program. Phase 2 swaps sample* for today_for_follower() via Supabase.

import { BlockBar } from "@/components/run/BlockBar";
import { BlockList, CreatorNote, WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { sampleCompletedDays, sampleCreator, sampleProgram, sampleToday, sampleWeek } from "@/lib/sample";
import { DAY_NAMES_LONG, dayDurationS, fmtMinutes } from "@/lib/types";

export default async function Today({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day: dayParam } = await searchParams;
  const selectedDay = dayParam ? Number(dayParam) : sampleToday.day;
  const day = sampleWeek.find((d) => d.day === selectedDay) ?? sampleToday;
  const isToday = day.day === sampleToday.day;
  const done = sampleCompletedDays.has(day.day);

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <div className="rl-stack" style={{ gap: "var(--rl-space-1)" }}>
        <span className="t-label c-muted">
          {isToday ? "Today" : DAY_NAMES_LONG[day.day - 1]} · Week {day.week} of {sampleProgram.weeks}
        </span>
        <h1 className="t-display-xl" style={{ margin: 0 }}>
          {dayTitle(day)}
        </h1>
      </div>

      {day.kind === "run" ? (
        <>
          <div className="rl-row">
            <span className="t-numeral-xl">{fmtMinutes(dayDurationS(day))}</span>
            {done && <span className="rl-chip rl-chip-success">Done</span>}
          </div>
          <BlockBar blocks={day.blocks} />
          <CreatorNote note={day.note} by={sampleCreator.displayName} />
          <div className="rl-row">
            <a className="rl-btn rl-btn-primary rl-btn-lg" href={`/api/fit?program=${sampleProgram.id}&week=${day.week}&day=${day.day}`} download>
              Send to watch
            </a>
            <button className="rl-btn rl-btn-secondary rl-btn-lg" type="button" disabled={done}>
              {done ? "Completed" : "Mark done"}
            </button>
          </div>
          <BlockList blocks={day.blocks} />
        </>
      ) : (
        <>
          <p className="t-title" style={{ margin: 0 }}>
            Nothing to run. That is the plan.
          </p>
          <CreatorNote note={day.note} by={sampleCreator.displayName} />
        </>
      )}

      <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
        <span className="t-label c-muted">This week</span>
        <WeekStrip days={sampleWeek} todayDay={sampleToday.day} done={sampleCompletedDays} selectedDay={day.day} hrefFor={(d) => `/app?day=${d.day}`} />
      </div>

      <p className="rl-help">Example program by {sampleCreator.displayName}. Real programs arrive in phase 2.</p>
    </main>
  );
}
