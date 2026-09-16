// Home. Your running, first: this week against the year, the shape of the last twelve weeks, what you did and
// when. Anything you follow sits under it, on today. Everything here comes from your own Strava.

import Link from "next/link";
import { RunCard } from "@/components/run/RunCard";
import { RouteSketch } from "@/components/run/RouteSketch";
import { StepCards } from "@/components/run/StepCards";
import { dayTitle } from "@/components/run/RunPieces";
import { realRuns } from "@/lib/db/explore";
import { getMyProfile, getMyWeek, listExtras, listScheduled } from "@/lib/db/programs";
import type { StravaStats } from "@/lib/integrations/strava";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { ago, refreshStravaInBackground } from "@/lib/integrations/autosync";
import { SAMPLE_EXPLORE, rankRuns } from "@/lib/explore";
import { mondayOf } from "@/lib/calendar";
import { RUN_TYPE_LABEL, addDays, dayDurationS, toISODate } from "@/lib/types";
import { climbLabel, distanceLabel, fmtClimb, fmtDistance, fmtPace, paceLabel, toDistance } from "@/lib/units";
import { markDoneAction } from "./actions";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RUNS = ["Run", "TrailRun", "VirtualRun"];
const fmtDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const hrs = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m` : `${Math.round(s / 60)}m`);

export default async function Home({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const today = toISODate(new Date());
  const weekStart = mondayOf(today);
  const configured = isConfigured();
  const [me, mine, feed] = configured ? await Promise.all([getMyProfile(), getMyWeek(today), realRuns().catch(() => null)]) : [null, null, null];
  const units = me?.units ?? "km";
  const U = distanceLabel(units);
  const supabase = configured ? await createClient() : null;
  const { data: conns } = me && supabase ? await supabase.from("connections").select("provider, last_sync_at, last_sync_error").eq("user_id", me.id) : { data: [] };
  const strava = (conns ?? []).find((c) => c.provider === "strava") ?? null;
  const hasStrava = !!strava;
  // Nothing polls Strava for us, so a stale page pulls again once it has been sent.
  if (me && strava) refreshStravaInBackground(me.id, strava.last_sync_at);
  const firstName = me?.displayName?.split(" ")[0];
  const stats = (me?.stravaStats ?? null) as StravaStats | null;

  // Twelve weeks of your own running.
  const acts = me ? await listExtras(me.id, toISODate(addDays(weekStart, -77)), today) : [];
  const thisWeek = acts.filter((x) => x.date >= weekStart && RUNS.includes(x.sportType));
  const weekDist = toDistance(thisWeek.reduce((a, x) => a + (x.distanceM ?? 0), 0), units);
  const weekS = thisWeek.reduce((a, x) => a + (x.durationS ?? 0), 0);
  const paced = thisWeek.filter((x) => x.avgPaceS);
  const avgPace = paced.length ? Math.round(paced.reduce((a, x) => a + (x.avgPaceS ?? 0), 0) / paced.length) : null;
  const byDay = new Map<number, number>();
  for (const x of thisWeek) {
    const d = Math.floor((addDays(x.date, 0).getTime() - addDays(weekStart, 0).getTime()) / 86400000);
    byDay.set(d, (byDay.get(d) ?? 0) + toDistance(x.distanceM ?? 0, units));
  }
  const maxDay = Math.max(1, ...byDay.values());
  const trend = Array.from({ length: 12 }, (_, i) => {
    const ws = toISODate(addDays(weekStart, -(11 - i) * 7));
    const we = toISODate(addDays(ws, 6));
    return { start: ws, km: toDistance(acts.filter((x) => RUNS.includes(x.sportType) && x.date >= ws && x.date <= we).reduce((a, x) => a + (x.distanceM ?? 0), 0), units) };
  });
  const maxWeek = Math.max(1, ...trend.map((t) => t.km));
  const recent = [...acts].reverse().slice(0, 6);
  const km = (m: number) => fmtDistance(m, units, { decimals: toDistance(m, units) >= 100 ? 0 : 1 });

  // Today's run: from the program you follow, or one you dragged onto today.
  const dropped = me ? await listScheduled(today, today) : [];
  const todayDay = mine && mine.sent ? mine.program.days.find((d) => d.week === mine.week && d.day === mine.todayDay) ?? null : null;
  const day = todayDay ?? dropped[0]?.day ?? null;
  const fromWho = todayDay ? mine!.creator.displayName : dropped[0]?.creator.name ?? "";
  const isDone = todayDay && mine ? mine.done.has(todayDay.day) : false;
  const fitHref = todayDay && mine ? `/api/fit?program=${mine.program.id}&week=${todayDay.week}&day=${todayDay.day}` : dropped[0] ? `/api/fit?program=${dropped[0].programId}&week=${dropped[0].day.week}&day=${dropped[0].day.day}` : null;

  // Runs from other people, for the rails.
  const example = !feed || (feed.popular.length === 0 && feed.fresh.length === 0);
  const pool = example ? SAMPLE_EXPLORE : [...feed!.popular, ...feed!.fresh.filter((f) => !feed!.popular.some((p) => p.key === f.key))];
  const others = rankRuns(pool, me).filter((r) => !mine || r.programId !== mine.program.id).slice(0, 4);

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1100px + 2 * var(--rl-gutter))", gap: "var(--rl-space-6)" }}>
      {kind === "runner" && (
        <div className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "10px 14px" }}>
          <span className="t-body-sm">This is a runner account. To write for runners, <Link href="/signup?as=creator">open a studio</Link> with another email.</span>
        </div>
      )}

      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted rl-kicker">Your running</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{firstName ? `Morning, ${firstName}.` : "Your running"}</h1>
        </div>
        <Link href="/app/calendar" className="rl-btn rl-btn-ghost rl-btn-sm">Calendar →</Link>
      </div>

      {!hasStrava ? (
        <div className="rl-connect-prompt">
          <span className="t-body-sm">Connect Strava and everything you have run lands here.</span>
          <Link href="/app/you#connections" className="rl-btn rl-btn-primary rl-btn-sm">Connect</Link>
        </div>
      ) : (
        <section className="rl-numbers" aria-label="Your numbers">
          <div className="week">
            <div className="rl-between" style={{ alignItems: "baseline" }}>
              <span className="t-label c-muted">This week</span>
              <span className="rl-help">{fmtDate(weekStart)} to {fmtDate(toISODate(addDays(weekStart, 6)))}</span>
            </div>
            <div className="big"><span className="n">{weekDist.toFixed(1)}</span><span className="u">{U}</span></div>
            <div className="bars" aria-hidden>
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} data-on={byDay.has(i) ? "true" : undefined} style={{ ["--h" as string]: `${Math.round(((byDay.get(i) ?? 0) / maxDay) * 100)}%` }}>
                  <i>{DOW[i]![0]}</i>
                </span>
              ))}
            </div>
          </div>
          <ul className="rows">
            <li><span className="k">Runs</span><span className="v">{thisWeek.length}<small> / {stats?.ytd.runs ?? "–"} this year</small></span></li>
            <li><span className="k">Time</span><span className="v">{hrs(weekS)}<small> / {stats ? hrs(stats.ytd.timeS) : "–"}</small></span></li>
            <li><span className="k">Average pace</span><span className="v">{avgPace ? fmtPace(avgPace, units) : "–"}<small> {paceLabel(units)}</small></span></li>
            <li><span className="k">Year to date</span><span className="v">{stats ? km(stats.ytd.distanceM) : "–"}<small> {U}</small></span></li>
            <li><span className="k">All time</span><span className="v">{stats ? km(stats.all.distanceM) : "–"}<small> {U}</small></span></li>
            <li><span className="k">Climbed, 4 weeks</span><span className="v">{stats ? fmtClimb(stats.recent.elevationM, units) : "–"}<small> {climbLabel(units)}</small></span></li>
          </ul>
        </section>
      )}

      {hasStrava && (
        <span className="rl-help" style={{ marginTop: "calc(-1 * var(--rl-space-4))" }}>
          {strava!.last_sync_error
            ? <>Strava: {strava!.last_sync_error} <Link href="/app/you#connections">Fix it</Link></>
            : <>From Strava, updated {ago(strava!.last_sync_at) ?? "on connect"}. <Link href="/app/you#connections">Sync now</Link></>}
        </span>
      )}

      {day && day.kind === "run" && (
        <article className="rl-today" data-run={day.runType ?? "easy"}>
          <div className="top">
            <span className="kicker">Today · {day.runType ? RUN_TYPE_LABEL[day.runType] : "Run"}{isDone ? " · done" : ""}</span>
            <h1><Link href={`/app/run/${day.id}`} style={{ color: "inherit", textDecoration: "none" }}>{dayTitle(day)}</Link></h1>
            <span className="facts">{fromWho}{day.blocks.length ? ` · ${Math.round(dayDurationS(day) / 60)} min` : ""}</span>
          </div>
          <div className="body">
            {day.note && <blockquote className="rl-note" style={{ margin: 0 }}><q>{day.note}</q></blockquote>}
            <div className="rl-row">
              {fitHref && <a className="rl-btn rl-btn-primary rl-btn-lg" href={fitHref} download>Send to watch</a>}
              {todayDay && mine && !isDone && (
                <form action={markDoneAction}>
                  <input type="hidden" name="enrollmentId" value={mine.enrollmentId} />
                  <input type="hidden" name="programDayId" value={todayDay.id} />
                  <button className="rl-btn rl-btn-ghost rl-btn-lg" type="submit">Mark done</button>
                </form>
              )}
              <Link href={`/app/run/${day.id}`} className="rl-btn rl-btn-ghost rl-btn-lg">Details</Link>
            </div>
            <StepCards day={day} pace5kS={me?.pace5kS} units={units} />
          </div>
        </article>
      )}

      {hasStrava && (
        <section className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <span className="t-label c-muted">Last 12 weeks</span>
            <span className="rl-help">{trend.reduce((a, t) => a + t.km, 0).toFixed(0)} {U}</span>
          </div>
          <div className="rl-trend" aria-hidden>
            {trend.map((t, i) => (
              <span key={t.start} data-now={i === trend.length - 1 ? "true" : undefined} style={{ ["--h" as string]: `${Math.round((t.km / maxWeek) * 100)}%` }} title={`${fmtDate(t.start)} · ${t.km.toFixed(1)} ${U}`} />
            ))}
          </div>
          <div className="rl-between">
            <span className="rl-help">{fmtDate(trend[0]!.start)}</span>
            <span className="rl-help">this week</span>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <h2 className="t-title" style={{ margin: 0 }}>Lately</h2>
            <Link href="/app/calendar" className="rl-help">All of it →</Link>
          </div>
          <ul className="rl-actlist">
            {recent.map((x) => (
              <li key={x.id}>
                <Link href={`/app/log/${x.id}`}>
                  {x.polyline ? <RouteSketch polyline={x.polyline} size={40} /> : <span className="rl-chip" style={{ justifySelf: "start" }}>{x.sportType.slice(0, 3)}</span>}
                  <span className="rl-stack" style={{ gap: 0, minWidth: 0 }}>
                    <span className="nm">{x.name ?? x.sportType}</span>
                    <span className="sub">{fmtDate(x.date)}{x.durationS ? ` · ${hrs(x.durationS)}` : ""}{x.avgHr ? ` · ${x.avgHr} bpm` : ""}{x.kudos ? ` · ${x.kudos} kudos` : ""}</span>
                  </span>
                  <span className="rt">{x.distanceM ? `${fmtDistance(x.distanceM, units)} ${U}` : ""}{x.avgPaceS ? <><br />{fmtPace(x.avgPaceS, units)} {paceLabel(units)}</> : null}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <h2 className="t-title" style={{ margin: 0 }}>{mine ? "Something different" : "Runs to try"}</h2>
            <Link href="/app/explore" className="rl-help">Explore →</Link>
          </div>
          <div className="rl-rail">{others.map((r) => <RunCard key={r.key} r={r} compact />)}</div>
          <span className="rl-help">Open the calendar to drop any of these on a day.</span>
        </section>
      )}
    </main>
  );
}
