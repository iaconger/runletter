// Today. One run, the creator's note, the steps in your own paces, two actions. Reads the runner's enrolment;
// shows the example week when they are not on anything yet.

import Link from "next/link";
import { BlockBar } from "@/components/run/BlockBar";
import { Ink } from "@/components/ui/Ink";
import { StepCards } from "@/components/run/StepCards";
import { CreatorNote, WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { getMyProfile, getMyWeek, listExtras } from "@/lib/db/programs";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { sampleCompletedDays, sampleCreator, sampleProgram, sampleToday, sampleWeek } from "@/lib/sample";
import { DAY_NAMES_LONG, addDays, dayDurationS, fmtMinutes, toISODate } from "@/lib/types";
import { markDoneAction } from "./actions";

export const dynamic = "force-dynamic";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function Today({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day: dayParam } = await searchParams;
  const today = toISODate(new Date());
  const configured = isConfigured();
  const [me, mine] = configured ? await Promise.all([getMyProfile(), getMyWeek(today)]) : [null, null];
  const supabase = configured ? await createClient() : null;
  const { data: conns } = me && supabase ? await supabase.from("connections").select("provider").eq("user_id", me.id) : { data: [] };
  const hasWatch = (conns ?? []).length > 0;

  const example = !mine;
  const program = mine?.program ?? sampleProgram;
  const creator = mine?.creator ?? sampleCreator;
  const week = mine?.week ?? sampleToday.week;
  const days = program.days.filter((d) => d.week === week);
  const todayDay = mine?.todayDay ?? sampleToday.day;
  const selectedDay = dayParam ? Number(dayParam) : todayDay;
  const day = days.find((d) => d.day === selectedDay) ?? null;
  const isToday = selectedDay === todayDay;
  const done = mine?.done ?? sampleCompletedDays;
  const isDone = day ? done.has(day.day) : false;
  const weekStart = mine?.weekStart ?? null;
  const extras = me && weekStart ? await listExtras(me.id, weekStart, toISODate(addDays(weekStart, 6))) : [];
  const extraByDay = new Map<number, string>();
  for (const x of extras) {
    const d = Math.floor((addDays(x.date, 0).getTime() - addDays(weekStart!, 0).getTime()) / 86400000) + 1;
    const km = x.distanceM ? `${(x.distanceM / 1000).toFixed(x.distanceM >= 10000 ? 0 : 1)} km` : "run";
    extraByDay.set(d, extraByDay.has(d) ? `${extraByDay.get(d)} +${km}` : `+${km}`);
  }
  const selExtras = extras.filter((x) => Math.floor((addDays(x.date, 0).getTime() - addDays(weekStart!, 0).getTime()) / 86400000) + 1 === selectedDay);
  const dateLabel = weekStart ? `${MONTHS[addDays(weekStart, selectedDay - 1).getMonth()]} ${addDays(weekStart, selectedDay - 1).getDate()}` : null;
  const mins = day ? Math.round(dayDurationS(day) / 60) : 0;
  const range = mins ? `${Math.max(5, Math.round(mins * 0.95 / 5) * 5)}–${Math.round(mins * 1.08 / 5) * 5} min` : "";
  const sent = mine ? mine.sent : true;

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      {me && !hasWatch && (
        <div className="rl-connect-prompt">
          <span className="t-body-sm">Connect your watch and Strava</span>
          <Link href="/app/you" className="rl-btn rl-btn-primary rl-btn-sm">Connect</Link>
        </div>
      )}

      <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
        <span className="t-label c-muted">
          {isToday ? "Today" : DAY_NAMES_LONG[selectedDay - 1]}{dateLabel ? ` · ${dateLabel}` : ""} · Week {week}{program.isLetter ? "" : ` of ${program.weeks}`}
        </span>
        <WeekStrip days={sent ? days : []} todayDay={todayDay} done={done} selectedDay={selectedDay} hrefFor={(d) => `/app?day=${d.day}`} weekStart={weekStart} today={today} extras={extraByDay} />
      </div>

      {!sent ? (
        <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <Ink name="breath" style={{ width: "min(100%, 320px)", opacity: 0.8 }} />
          <p className="t-title" style={{ margin: 0 }}>{creator.displayName} hasn&rsquo;t sent this week yet.</p>
        </div>
      ) : day && day.kind === "run" ? (
        <>
          <div className="rl-stack" style={{ gap: 4 }}>
            <h1 className="t-display-xl" style={{ margin: 0 }}>{dayTitle(day)}</h1>
            <div className="rl-row" style={{ alignItems: "baseline" }}>
              <span className="t-numeral-lg">{range || fmtMinutes(dayDurationS(day))}</span>
              {isDone && <span className="rl-chip rl-chip-success">Done</span>}
            </div>
          </div>
          <BlockBar blocks={day.blocks} legend={false} />
          {mine?.intro && selectedDay === 1 && <CreatorNote note={mine.intro} by={creator.displayName} avatarUrl={creator.avatarUrl} />}
          {day.note && (
            <div>
              <CreatorNote note={day.note} by={creator.displayName} avatarUrl={creator.avatarUrl} />
            </div>
          )}
          <div className="rl-row">
            <a className="rl-btn rl-btn-primary rl-btn-lg" href={`/api/fit?program=${program.id}&week=${day.week}&day=${day.day}`} download>Send to watch</a>
            {mine && !isDone ? (
              <form action={markDoneAction}>
                <input type="hidden" name="enrollmentId" value={mine.enrollmentId} />
                <input type="hidden" name="programDayId" value={day.id} />
                <button className="rl-btn rl-btn-secondary rl-btn-lg" type="submit">Mark done</button>
              </form>
            ) : (
              <button className="rl-btn rl-btn-secondary rl-btn-lg" type="button" disabled>{isDone ? "Completed" : "Mark done"}</button>
            )}
          </div>
          <StepCards day={day} pace5kS={me?.pace5kS} />
          {me && !me.pace5kS && (
            <p className="rl-help" style={{ margin: 0 }}>Paces are in effort words. <Link href="/app/you">Add your 5K time</Link> to see your own numbers.</p>
          )}
        </>
      ) : (
        <>
          <h1 className="t-display-xl" style={{ margin: 0 }}>{day ? dayTitle(day) : "Rest"}</h1>
          <Ink name="breath" style={{ width: "min(100%, 320px)", opacity: 0.8 }} />
          {day?.note && <CreatorNote note={day.note} by={creator.displayName} avatarUrl={creator.avatarUrl} />}
        </>
      )}

      {selExtras.length > 0 && (
        <div className="rl-stack" style={{ gap: 6 }}>
          <span className="t-label c-muted">Also ran</span>
          {selExtras.map((x) => (
            <div key={x.id} className="rl-between rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "8px 12px" }}>
              <span className="t-body-sm">{x.name ?? "Run"}</span>
              <span className="t-body-sm c-secondary" style={{ fontVariantNumeric: "tabular-nums" }}>{x.distanceM ? `${(x.distanceM / 1000).toFixed(1)} km` : ""}{x.durationS ? ` · ${Math.round(x.durationS / 60)} min` : ""}</span>
            </div>
          ))}
        </div>
      )}

      {example && <p className="rl-help">Example week by {sampleCreator.displayName}. Subscribe to a creator, or start your own Letter, and this becomes yours.</p>}
    </main>
  );
}
