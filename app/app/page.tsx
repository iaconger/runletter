// Today. The run, in the creator's words, one tap to the watch. Under it: the whole week (every day opens),
// a few runs from other people, and what you actually ran. Nothing planned: runs to try and people to follow.

import Link from "next/link";
import { RunCard } from "@/components/run/RunCard";
import { RunLog } from "@/components/run/RunLog";
import { StepCards } from "@/components/run/StepCards";
import { WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { EXAMPLE_CREATORS } from "@/components/ui/Ink";
import { realRuns } from "@/lib/db/explore";
import { getMyProfile, getMyWeek, listExtras, listMyRuns } from "@/lib/db/programs";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { SAMPLE_EXPLORE, rankRuns } from "@/lib/explore";
import { DAY_NAMES_LONG, RUN_TYPE_LABEL, addDays, dayDurationS, toISODate } from "@/lib/types";
import { distanceLabel, fmtDistance } from "@/lib/units";
import { markDoneAction } from "./actions";

export const dynamic = "force-dynamic";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

export default async function Today({ searchParams }: { searchParams: Promise<{ day?: string; kind?: string }> }) {
  const { day: dayParam, kind } = await searchParams;
  const today = toISODate(new Date());
  const configured = isConfigured();
  const [me, mine, feed] = configured ? await Promise.all([getMyProfile(), getMyWeek(today), realRuns().catch(() => null)]) : [null, null, null];
  const supabase = configured ? await createClient() : null;
  const { data: conns } = me && supabase ? await supabase.from("connections").select("provider").eq("user_id", me.id) : { data: [] };
  const hasWatch = (conns ?? []).length > 0;
  const firstName = me?.displayName?.split(" ")[0];
  // Runs from other people: real published runs when there are any, ranked by the runner's goal and days a week.
  const example = !feed || (feed.popular.length === 0 && feed.fresh.length === 0);
  const pool = example ? SAMPLE_EXPLORE : [...feed!.popular, ...feed!.fresh.filter((f) => !feed!.popular.some((p) => p.key === f.key))];
  const others = rankRuns(pool, me);
  const creators = example
    ? EXAMPLE_CREATORS.map((c) => ({ id: c.name, name: c.display, handle: c.name, avatarUrl: `/brand/photo/${c.name}.webp`, bio: `${c.focus} · ${c.city}` }))
    : feed!.creators;

  // Runs actually done, last 7 days, whether or not anything was planned.
  const weekAgo = toISODate(addDays(today, -6));
  const log = me ? await listMyRuns(weekAgo, today) : [];
  const units = me?.units ?? "km";
  const totalM = log.reduce((s, r) => s + (r.distanceM ?? 0), 0);

  const kindNote = kind === "runner" && (
    <div className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "10px 14px" }}>
      <span className="t-body-sm">This is a runner account. To write for runners, <Link href="/signup?as=creator">open a studio</Link> with another email.</span>
    </div>
  );
  const connect = me && !hasWatch && (
    <div className="rl-connect-prompt">
      <span className="t-body-sm">Connect your watch and Strava</span>
      <Link href="/app/you" className="rl-btn rl-btn-primary rl-btn-sm">Connect</Link>
    </div>
  );

  const runLog = me && (
    <section className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
      <div className="rl-between" style={{ alignItems: "baseline" }}>
        <h2 className="t-title" style={{ margin: 0 }}>Your runs this week</h2>
        {log.length > 0 && <span className="c-muted t-body-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{log.length} run{log.length === 1 ? "" : "s"} · {fmtDistance(totalM, units)} {distanceLabel(units)}</span>}
      </div>
      <RunLog runs={log} units={units} empty={hasWatch ? "Nothing from Strava in the last 7 days." : "Connect Strava and your runs show up here."} />
      <Link href="/app/you" className="rl-help" style={{ alignSelf: "flex-start" }}>Last 30 days →</Link>
    </section>
  );

  if (!mine) {
    return (
      <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">{fmt(new Date())}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{firstName ? `Morning, ${firstName}.` : "Today"}</h1>
        </div>
        {kindNote}
        {connect}
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <h2 className="t-title" style={{ margin: 0 }}>Nothing planned. Pick one.</h2>
            <Link href="/app/explore" className="rl-help">All runs →</Link>
          </div>
          <div className="rl-picks">
            {others.slice(0, 4).map((r) => <RunCard key={r.key} r={r} compact />)}
          </div>
        </section>
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <h2 className="t-title" style={{ margin: 0 }}>People to run with</h2>
          <div className="rl-grid2">
            {creators.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/c/${c.handle}`} className="rl-creatorcard">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="rl-avatar" style={{ width: 44, height: 44 }} />}
                <span className="rl-stack" style={{ gap: 0, minWidth: 0 }}>
                  <span className="t-body-medium">{c.name}</span>
                  <span className="rl-help" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.bio}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        {runLog}
      </main>
    );
  }

  const { program, creator, week, todayDay, weekStart, done, sent, intro } = mine;
  const days = program.days.filter((d) => d.week === week).sort((a, b) => a.day - b.day);
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
    const xkm = x.distanceM ? `${fmtDistance(x.distanceM, units)} ${distanceLabel(units)}` : "run";
    extraByDay.set(d, extraByDay.has(d) ? `${extraByDay.get(d)} +${xkm}` : `+${xkm}`);
  }
  const planned = days.filter((d) => d.kind === "run").length;
  const doneCount = days.filter((d) => d.kind === "run" && done.has(d.day)).length;
  const otherPeople = others.filter((r) => r.programId !== program.id).slice(0, 4);

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      {kindNote}
      {connect}

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
            <h1><Link href={`/app/run/${day.id}`} style={{ color: "inherit", textDecoration: "none" }}>{dayTitle(day)}</Link></h1>
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
              <Link href={`/app/run/${day.id}`} className="rl-btn rl-btn-ghost rl-btn-lg">Details</Link>
            </div>
            <StepCards day={day} pace5kS={me?.pace5kS} units={units} />
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

      {sent && days.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <h2 className="t-title" style={{ margin: 0 }}>Week {week}</h2>
            {program.isLetter && <span className="c-muted t-body-sm">{creator.displayName}</span>}
          </div>
          <div className="rl-weekbar" aria-label="Week progress">
            <div className="segs">
              {days.filter((d) => d.kind === "run").map((d) => <i key={d.id} data-on={done.has(d.day) ? "true" : undefined} data-today={d.day === todayDay && !done.has(d.day) ? "true" : undefined} />)}
            </div>
            <div className="nums">
              <span><b>{doneCount}</b> of {planned} runs</span>
              <span><b>{Math.round(days.filter((d) => done.has(d.day)).reduce((a, d) => a + dayDurationS(d), 0) / 60)}</b> of {Math.round(days.reduce((a, d) => a + dayDurationS(d), 0) / 60)} min</span>
            </div>
          </div>
          <ul className="rl-daylist">
            {days.map((d) => {
              const cls = [d.day === todayDay ? "today" : "", d.day < todayDay ? "past" : "", done.has(d.day) ? "done" : ""].join(" ").trim();
              const m = d.kind === "run" ? `${Math.round(dayDurationS(d) / 60)} min` : "";
              const status = done.has(d.day) ? "Done" : d.day === todayDay ? "Today" : extraByDay.get(d.day) ?? "";
              const inner = (
                <>
                  <span className="k">{DOW[d.day - 1]}</span>
                  <span className="t">{dayTitle(d)}</span>
                  <span className="m">{[m, status].filter(Boolean).join(" · ")}</span>
                </>
              );
              return (
                <li key={d.id} className={cls} data-run={d.kind === "run" ? d.runType ?? "easy" : undefined}>
                  {d.kind === "run" ? <Link href={`/app/run/${d.id}`}>{inner}</Link> : <span>{inner}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {otherPeople.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <h2 className="t-title" style={{ margin: 0 }}>{example ? "Something different" : "Popular this month"}</h2>
            <Link href="/app/explore" className="rl-help">Explore →</Link>
          </div>
          <div className="rl-rail">{otherPeople.map((r) => <RunCard key={r.key} r={r} compact />)}</div>
        </section>
      )}

      {runLog}
    </main>
  );
}
