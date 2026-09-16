// Overview. The creator's own running from Strava, the way a watch shows it: a row per number, this week
// against the rest. Plus who's following and what's gone out. The studio's front page once a Letter exists.
import Link from "next/link";
import { RouteSketch } from "@/components/run/RouteSketch";
import { PickedRotation, Rotation, shoesOf } from "@/components/studio/Rotation";
import { getMyProfile, listExtras, listMyRunners, listMyPrograms, listIssues, listShoes } from "@/lib/db/programs";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { ago, refreshStravaInBackground } from "@/lib/integrations/autosync";
import type { StravaStats } from "@/lib/integrations/strava";
import { climbLabel, distanceLabel, fmtClimb, fmtDistance, fmtPace, paceLabel, toDistance } from "@/lib/units";
import { mondayOf } from "@/lib/calendar";
import { addDays, toISODate } from "@/lib/types";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RUNS = ["Run", "TrailRun", "VirtualRun"];

/** Preview only: without Supabase there is no signed-in creator, so show the shape of the screen. */
const SAMPLE_ME = { id: "x", handle: "sarah", displayName: "Sarah Okafor", avatarUrl: null, coverUrl: null, bio: "", isCreator: true, links: {}, pace5kS: 1290, stripeChargesEnabled: false, goal: null, raceDate: null, daysPerWeek: 5, stravaStats: { recent: { runs: 17, distanceM: 152000, timeS: 51000, elevationM: 940 }, ytd: { runs: 198, distanceM: 1784000, timeS: 601000, elevationM: 11200 }, all: { runs: 1442, distanceM: 12960000, timeS: 4380000, elevationM: 84000 }, syncedAt: "" } } as unknown as Awaited<ReturnType<typeof getMyProfile>>;
function sampleActs(today: string) {
  const km = [8.2, 12.4, 6.1, 16.0, 9.3, 5.4, 18.2, 7.7, 11.1, 6.6, 14.2, 8.8, 10.4, 5.9, 21.1, 9.8, 7.2, 12.9];
  return km.map((d, i) => ({ id: `s${i}`, date: toISODate(addDays(today, -Math.round(i * 4.2))), name: "Morning run", distanceM: d * 1000, durationS: Math.round(d * 330), sportType: "Run", avgPaceS: 320 + (i % 5) * 9, elevationM: Math.round(d * 8), avgHr: 142 + (i % 7), kudos: 3 + (i % 9), polyline: null, stravaActivityId: null })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export default async function Overview() {
  const today = toISODate(new Date());
  const configured = isConfigured();
  const me = configured ? await getMyProfile() : SAMPLE_ME;
  if (!me) {
    return (
      <main className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-5)" }}>
        <h1 className="t-display-lg" style={{ margin: 0 }}>Overview</h1>
        <p className="c-secondary" style={{ margin: 0 }}>Sign in to see your running.</p>
      </main>
    );
  }
  const stats = (me.stravaStats ?? null) as StravaStats | null;
  const picked = configured ? await listShoes(me.id) : [];
  const units = me.units ?? "km";
  const U = distanceLabel(units);
  const weekStart = mondayOf(today);
  const [acts, runners, programs] = configured
    ? await Promise.all([listExtras(me.id, toISODate(addDays(weekStart, -77)), today), listMyRunners(today).catch(() => []), listMyPrograms().catch(() => [])])
    : [sampleActs(today), [], []];
  const supabase = configured ? await createClient() : null;
  const { data: conns } = supabase ? await supabase.from("connections").select("provider, last_sync_at, last_sync_error").eq("user_id", me.id).eq("provider", "strava") : { data: [{ provider: "strava", last_sync_at: null, last_sync_error: null }] };
  const strava = (conns ?? [])[0] ?? null;
  const hasStrava = !!strava;
  if (configured && strava) refreshStravaInBackground(me.id, strava.last_sync_at);

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
  // Twelve weeks of volume, oldest first: the shape of the block, the way a training log reads.
  const trend = Array.from({ length: 12 }, (_, i) => {
    const ws = toISODate(addDays(weekStart, -(11 - i) * 7));
    const we = toISODate(addDays(ws, 6));
    const v = toDistance(acts.filter((x) => RUNS.includes(x.sportType) && x.date >= ws && x.date <= we).reduce((a, x) => a + (x.distanceM ?? 0), 0), units);
    return { start: ws, km: v };
  });
  const maxWeek = Math.max(1, ...trend.map((t) => t.km));
  const letter = programs.find((p) => p.isLetter) ?? null;
  const issues = letter ? await listIssues(letter.id) : [];
  const sent = issues.filter((i) => i.sentAt).length;
  const latest = [...acts].reverse().find((x) => RUNS.includes(x.sportType)) ?? null;
  const km = (m: number) => fmtDistance(m, units, { decimals: toDistance(m, units) >= 100 ? 0 : 1 });
  const hrs = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m` : `${Math.round(s / 60)}m`);
  const firstName = me.displayName?.split(" ")[0];

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1100px + 2 * var(--rl-gutter))", gap: "var(--rl-space-6)" }}>
      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted rl-kicker">Your running</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{firstName ? `Morning, ${firstName}.` : "Overview"}</h1>
        </div>
        {letter && <Link href={`/studio/programs/${letter.id}`} className="rl-btn rl-btn-primary rl-btn-sm">Open this week →</Link>}
      </div>

      {!hasStrava ? (
        <div className="rl-connect-prompt">
          <span className="t-body-sm">Connect Strava and your own running shows up here.</span>
          <Link href="/studio/page#connections" className="rl-btn rl-btn-primary rl-btn-sm">Connect</Link>
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
            ? <>Strava: {strava!.last_sync_error} <Link href="/studio/page#connections">Fix it</Link></>
            : <>From Strava, updated {ago(strava!.last_sync_at) ?? "on connect"}. <Link href="/studio/page#connections">Sync now</Link></>}
        </span>
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

      {picked.length > 0 ? <PickedRotation shoes={picked} units={units} title="Your rotation" /> : hasStrava ? <Rotation shoes={shoesOf(me.stravaGear)} units={units} title="Your rotation" /> : null}

      <div className="rl-grid2">
        {latest && (
          <section className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
            <span className="t-label c-muted">Your last run</span>
            <div className="rl-row" style={{ alignItems: "center", gap: "var(--rl-space-4)" }}>
              {latest.polyline && <RouteSketch polyline={latest.polyline} size={72} />}
              <div className="rl-stack" style={{ gap: 2, minWidth: 0 }}>
                <span className="t-heading" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{latest.name ?? "Run"}</span>
                <span className="rl-help">{fmtDate(latest.date)}{latest.distanceM ? ` · ${fmtDistance(latest.distanceM, units)} ${U}` : ""}{latest.avgPaceS ? ` · ${fmtPace(latest.avgPaceS, units)} ${paceLabel(units)}` : ""}</span>
              </div>
            </div>
            <Link href="/studio" className="rl-textlink" style={{ alignSelf: "flex-start" }}>Share a run into your week →</Link>
          </section>
        )}
        <section className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
          <span className="t-label c-muted">Your runners</span>
          <div className="rl-row" style={{ gap: "var(--rl-space-5)", alignItems: "baseline" }}>
            <div className="rl-stack" style={{ gap: 0 }}>
              <span className="t-numeral-lg" style={{ font: "500 28px/32px var(--rl-font-sans)" }}>{runners.length}</span>
              <span className="rl-help">following</span>
            </div>
            <div className="rl-stack" style={{ gap: 0 }}>
              <span className="t-numeral-lg" style={{ font: "500 28px/32px var(--rl-font-sans)" }}>{sent}</span>
              <span className="rl-help">weeks sent</span>
            </div>
          </div>
          <Link href="/studio/subscribers" className="rl-textlink" style={{ alignSelf: "flex-start" }}>See who&rsquo;s running →</Link>
        </section>
      </div>
    </main>
  );
}
