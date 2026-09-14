// Today. One card: the run, in the creator's words, one tap to the watch. Under it, the week and what you ran.
// Nothing planned: a run to try instead. No example weeks pretending to be yours.

import Link from "next/link";
import { RunCard } from "@/components/run/RunCard";
import { RunLog } from "@/components/run/RunLog";
import { StepCards } from "@/components/run/StepCards";
import { WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { getMyProfile, getMyWeek, listExtras, listMyRuns } from "@/lib/db/programs";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { SAMPLE_EXPLORE, rankRuns } from "@/lib/explore";
import { realRuns } from "@/lib/db/explore";
import { DAY_NAMES_LONG, RUN_TYPE_LABEL, addDays, dayDurationS, toISODate } from "@/lib/types";
import { markDoneAction } from "./actions";

export const dynamic = "force-dynamic";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

export default async function Today({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day: dayParam } = await searchParams;
  const today = toISODate(new Date());
  const configured = isConfigured();
  const [me, mine] = configured ? await Promise.all([getMyProfile(), getMyWeek(today)]) : [null, null];
  const supabase = configured ? await createClient() : null;
  const { data: conns } = me && supabase ? await supabase.from("connections").select("provider").eq("user_id", me.id) : { data: [] };
  const hasWatch = (conns ?? []).length > 0;
  const firstName = me?.displayName?.split(" ")[0];

  // Runs actually done, last 7 days, whether or not anything was planned.
  const weekAgo = toISODate(addDays(today, -6));
  const log = me ? await listMyRuns(weekAgo, today) : [];

  if (!mine) {
    // Runs to try: real published runs when there are any, ranked by the runner's goal and days a week.
    const real = configured ? await realRuns().catch(() => null) : null;
    const pool = real && (real.popular.length || real.fresh.length) ? [...real.popular, ...real.fresh.filter((f) => !real.popular.some((p) => p.key === f.key))] : SAMPLE_EXPLORE;
    const picks = rankRuns(pool, me).slice(0, 4);
    return (
      <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">{fmt(new Date())}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{firstName ? `Morning, ${firstName}.` : "Today"}</h1>
        </div>
        {me && !hasWatch && (
          <div className="rl-connect-prompt">
            <span className="t-body-sm">Connect your watch and Strava</span>
            <Link href="/app/you" className="rl-btn rl-btn-primary rl-btn-sm">Connect</Link>
          </div>
        )}
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <h2 className="t-title" style={{ margin: 0 }}>Nothing planned. Pick one.</h2>
          <div className="rl-rail">
            {picks.map((r) => <RunCard key={r.key} r={r} compact />)}
          </div>
          <Link href="/app/explore" className="rl-btn rl-btn-secondary" style={{ alignSelf: "flex-start" }}>Explore creators</Link>
        </section>
        {me && (
          <section className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
            <h2 className="t-title" style={{ margin: 0 }}>Your runs this week</h2>
            <RunLog runs={log} empty={hasWatch ? "Nothing from Strava in the last 7 days." : "Connect Strava and your runs show up here."} />
          </section>
        )}
      </main>
    );
  }

  const { program, creator, week, todayDay, weekStart, done, sent, intro } = mine;
  const days = program.days.filter((d) => d.week === week);
  const selectedDay = dayParam ? Number(dayParam) : todayDay;
  const day = days.find((d) => d.day === selectedDay) ?? null;
  const isToday = selectedDay === todayDay;
  const isDone = day ? done.has(day.day) : false;
  const date = addDays(weekStart, selectedDay - 1);
  const mins = day ? Math.round(dayDurationS(day) / 60) : 0;
  const range = mins ? `${Math.max(5, Math.round((mins * 0.95) / 5) * 5)}–${Math.round((mins * 1.08) / 5) * 5} min` : "";
  const extras = await listExtras(me!.id, weekStart, toISODate(addDays(weekStart, 6)));
  const extraByDay = new Map<number, string>();
  for (const x of extras) {
    const d = Math.floor((addDays(x.date, 0).getTime() - addDays(weekStart, 0).getTime()) / 86400000) + 1;
    const km = x.distanceM ? `${(x.distanceM / 1000).toFixed(x.distanceM >= 10000 ? 0 : 1)} km` : "run";
    extraByDay.set(d, extraByDay.has(d) ? `${extraByDay.get(d)} +${km}` : `+${km}`);
  }

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      {me && !hasWatch && (
        <div className="rl-connect-prompt">
          <span className="t-body-sm">Connect your watch and Strava</span>
          <Link href="/app/you" className="rl-btn rl-btn-primary rl-btn-sm">Connect</Link>
        </div>
      )}

      <div className="rl-stack rl-week-mini" style={{ gap: "var(--rl-space-2)" }}>
        <span className="t-label c-muted">{isToday ? "Today" : DAY_NAMES_LONG[selectedDay - 1]} · {fmt(date)}</span>
        <WeekStrip days={sent ? days : []} todayDay={todayDay} done={done} selectedDay={selectedDay} hrefFor={(d) => `/app?day=${d.day}`} weekStart={weekStart} today={today} extras={extraByDay} />
      </div>

      {!sent ? (
        <div className="rl-today">
          <div className="top"><span className="kicker">Week {week}</span><h1>Not sent yet.</h1><span className="facts">{creator.displayName} is still writing this week.</span></div>
        </div>
      ) : day && day.kind === "run" ? (
        <article className="rl-today" data-run={day.runType ?? "easy"}>
          <div className="top">
            <span className="kicker">{day.runType ? RUN_TYPE_LABEL[day.runType] : "Run"}{isDone ? " · done" : ""}</span>
            <h1>{dayTitle(day)}</h1>
            <span className="facts">{range}</span>
          </div>
          <div className="body">
            <span className="who">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {creator.avatarUrl && <img src={creator.avatarUrl} alt="" />}
              {creator.displayName}{program.isLetter ? "" : ` · ${program.title}`}
            </span>
            {(selectedDay === 1 && intro) || day.note ? (
              <blockquote className="rl-note" style={{ margin: 0 }}>
                <q>{selectedDay === 1 && intro ? intro : day.note}</q>
              </blockquote>
            ) : null}
            <div className="rl-row">
              <a className="rl-btn rl-btn-primary rl-btn-lg" href={`/api/fit?program=${program.id}&week=${day.week}&day=${day.day}`} download>Send to watch</a>
              {!isDone ? (
                <form action={markDoneAction}>
                  <input type="hidden" name="enrollmentId" value={mine.enrollmentId} />
                  <input type="hidden" name="programDayId" value={day.id} />
                  <button className="rl-btn rl-btn-ghost rl-btn-lg" type="submit">Mark done</button>
                </form>
              ) : (
                <span className="rl-chip rl-chip-success" style={{ alignSelf: "center" }}>Done</span>
              )}
            </div>
            <StepCards day={day} pace5kS={me?.pace5kS} />
            {me && !me.pace5kS && <span className="rl-help"><Link href="/app/you">Add your 5K time</Link> for your own paces.</span>}
          </div>
        </article>
      ) : (
        <article className="rl-today">
          <div className="top">
            <span className="kicker">{day?.kind === "cross" ? "Cross" : "Rest"}</span>
            <h1>{day?.kind === "cross" ? "Something that isn't running." : "Rest day."}</h1>
          </div>
          {day?.note && (
            <div className="body">
              <blockquote className="rl-note" style={{ margin: 0 }}><q>{day.note}</q></blockquote>
            </div>
          )}
        </article>
      )}

      <section className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
        <h2 className="t-title" style={{ margin: 0 }}>Your runs this week</h2>
        <RunLog runs={log} empty={hasWatch ? "Nothing yet this week." : "Connect Strava and your runs show up here."} />
      </section>
    </main>
  );
}
