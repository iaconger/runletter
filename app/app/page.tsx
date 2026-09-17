// Home for a runner: the month, with what the people you follow are running on each day and what you ran
// yourself. Under it, runs you could take. Tapping any of theirs is "Run with them".
import Link from "next/link";
import { RunCard } from "@/components/run/RunCard";
import { realRuns, followedDays } from "@/lib/db/explore";
import { getMyProfile, listExtras, listScheduled, listMyCreators, listMyPlansInProgress } from "@/lib/db/programs";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { ago, refreshStravaInBackground } from "@/lib/integrations/autosync";
import { SAMPLE_EXPLORE, rankRuns } from "@/lib/explore";
import { RUN_TYPE_LABEL, toISODate } from "@/lib/types";
import { distanceLabel, fmtDistance, toDistance } from "@/lib/units";
import { DEMO_CREATORS, DEMO_ON_NOW, demoFollowedDays, demoMine } from "@/lib/demo";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RUNS = ["Run", "TrailRun", "VirtualRun"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function Home({ searchParams }: { searchParams: Promise<{ kind?: string; m?: string; demo?: string }> }) {
  const { kind, m, demo } = await searchParams;
  const preview = demo === "1";
  const today = toISODate(new Date());
  const now = new Date();
  const shift = Math.max(-24, Math.min(6, Number(m) || 0));
  const first = new Date(now.getFullYear(), now.getMonth() + shift, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  // The grid starts on the Monday on or before the first, and runs whole weeks.
  const lead = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - lead);
  const cells = Math.ceil((lead + last.getDate()) / 7) * 7;

  const configured = isConfigured();
  const [me, feed] = configured ? await Promise.all([getMyProfile(), realRuns().catch(() => null)]) : [null, null];
  const units = me?.units ?? "km";
  const supabase = configured ? await createClient() : null;
  const { data: conns } = me && supabase ? await supabase.from("connections").select("provider, last_sync_at, last_sync_error").eq("user_id", me.id) : { data: [] };
  const strava = (conns ?? []).find((c) => c.provider === "strava") ?? null;
  if (me && strava) refreshStravaInBackground(me.id, strava.last_sync_at);

  const from = iso(gridStart);
  const to = iso(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + cells - 1));
  const [mine, theirs, dropped, following, onNow] = me
    ? await Promise.all([
        listExtras(me.id, from, to),
        followedDays(from, to).catch(() => []),
        listScheduled(from, to).catch(() => []),
        listMyCreators().catch(() => []),
        listMyPlansInProgress(today).catch(() => []),
      ])
    : [[], [], [], [], []];

  // Dummy data, on request only, so the screen can be judged before anyone has followed anybody.
  const mineShown = preview ? (demoMine(from, to) as unknown as typeof mine) : mine;
  const theirsShown = preview ? (demoFollowedDays(from, to) as unknown as typeof theirs) : theirs;
  const followingShown = preview ? (DEMO_CREATORS as unknown as typeof following) : following;
  const onNowShown = preview ? (DEMO_ON_NOW as unknown as typeof onNow) : onNow;

  const byDateMine = new Map<string, typeof mine>();
  for (const x of mineShown) byDateMine.set(x.date, [...(byDateMine.get(x.date) ?? []), x]);
  const byDateTheirs = new Map<string, typeof theirs>();
  for (const d of theirsShown) byDateTheirs.set(d.date, [...(byDateTheirs.get(d.date) ?? []), d]);
  const byDateDropped = new Map<string, typeof dropped>();
  for (const d of dropped) byDateDropped.set(d.date, [...(byDateDropped.get(d.date) ?? []), d]);

  const monthRuns = mineShown.filter((x) => RUNS.includes(x.sportType) && x.date.slice(0, 7) === iso(first).slice(0, 7));
  const monthM = monthRuns.reduce((a, x) => a + (x.distanceM ?? 0), 0);

  // Runs to take, from people you follow first, then everything else.
  const example = !feed || (feed.popular.length === 0 && feed.fresh.length === 0);
  const pool = example ? SAMPLE_EXPLORE : [...feed!.popular, ...feed!.fresh.filter((f) => !feed!.popular.some((p) => p.key === f.key))];
  const picks = rankRuns(pool, me).slice(0, 4);

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1000px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
      {kind === "runner" && (
        <div className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "10px 14px" }}>
          <span className="t-body-sm">This is a runner account. To write for runners, <Link href="/signup?as=creator">open a studio</Link> with another email.</span>
        </div>
      )}

      {preview && (
        <div className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "10px 14px" }}>
          <span className="t-body-sm">Preview with made-up data. <Link href="/app">Show the real thing</Link>.</span>
        </div>
      )}

      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted rl-kicker">
            {monthRuns.length > 0 ? `${monthRuns.length} runs · ${fmtDistance(monthM, units, { decimals: 0 })} ${distanceLabel(units)}` : "Your month"}
          </span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{MONTHS[first.getMonth()]}{first.getFullYear() !== now.getFullYear() ? ` ${first.getFullYear()}` : ""}</h1>
        </div>
        <div className="rl-row" style={{ gap: 6 }}>
          <Link href={`/app?m=${shift - 1}`} className="rl-btn rl-btn-ghost rl-btn-sm">←</Link>
          {shift !== 0 && <Link href="/app" className="rl-btn rl-btn-ghost rl-btn-sm">This month</Link>}
          <Link href={`/app?m=${shift + 1}`} className="rl-btn rl-btn-ghost rl-btn-sm">→</Link>
        </div>
      </div>

      {me && (
        <section className="rl-following" aria-label="People you follow">
          {followingShown.map((c) => (
            <Link key={c.id} href={`/c/${c.handle}`} title={`${c.name} · ${c.subscribed ? "subscribed" : "plan"}`}>
              <span className="rl-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="ini">{(c.name || c.handle)[0]?.toUpperCase()}</span>}
              </span>
              <span className="nm">{(c.name || c.handle).split(" ")[0]}</span>
            </Link>
          ))}
          <Link href="/app/explore" className="add">
            <span className="rl-avatar plus">+</span>
            <span className="nm">{followingShown.length ? "Find more" : "Follow someone"}</span>
          </Link>
        </section>
      )}

      {onNowShown.length > 0 && (
        <ul className="rl-onnow" aria-label="What you are running">
          {onNowShown.map((p) => (
            <li key={p.enrollmentId}>
              <Link href={`/c/${p.creator.handle}`}>
                <span className="rl-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.creator.avatarUrl ? <img src={p.creator.avatarUrl} alt="" /> : <span className="ini">{p.creator.name[0]?.toUpperCase()}</span>}
                </span>
                <span className="rl-stack" style={{ gap: 1, minWidth: 0 }}>
                  <b>{p.title}</b>
                  <span className="sub">{p.creator.name} · {p.isLetter ? `week ${p.week}` : `week ${p.week} of ${p.weeks}`}</span>
                </span>
                <span className="prog">
                  <span className="bar" aria-hidden><i style={{ width: `${p.runsThisWeek ? Math.round((p.doneThisWeek / p.runsThisWeek) * 100) : 0}%` }} /></span>
                  <span className="cnt">{p.doneThisWeek}/{p.runsThisWeek || 0} this week</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!strava && me && (
        <div className="rl-connect-prompt">
          <span className="t-body-sm">Connect Strava and your own running fills this in.</span>
          <Link href="/app/you#connections" className="rl-btn rl-btn-primary rl-btn-sm">Connect</Link>
        </div>
      )}

      <section className="rl-month" aria-label={`${MONTHS[first.getMonth()]} ${first.getFullYear()}`}>
        <div className="dow" aria-hidden>{DOW.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="grid">
          {Array.from({ length: cells }, (_, i) => {
            const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
            const date = iso(d);
            const out = d.getMonth() !== first.getMonth();
            const ran = byDateMine.get(date) ?? [];
            const plans = byDateTheirs.get(date) ?? [];
            const drops = byDateDropped.get(date) ?? [];
            return (
              <div key={date} className="cell" data-out={out ? "true" : undefined} data-today={date === today ? "true" : undefined}>
                <span className="n">{d.getDate()}</span>
                {plans.map((p) => (
                  <Link key={p.dayId} href={`/app/run/${p.dayId}`} className="plan" data-run={p.kind === "run" ? p.runType ?? "easy" : p.kind} title={`${p.creator.name} · ${p.kind === "run" ? p.runType ?? "run" : p.kind}`}>
                    <b>{p.creator.name.split(" ")[0]}</b>
                    <span>{p.kind === "rest" ? "Rest" : p.kind === "cross" ? "Cross" : p.runType ? RUN_TYPE_LABEL[p.runType as keyof typeof RUN_TYPE_LABEL] : "Run"}</span>
                  </Link>
                ))}
                {drops.map((p) => (
                  <Link key={p.id} href={`/app/run/${p.day.id}`} className="plan mine" data-run={p.day.runType ?? "easy"}>
                    <b>Yours</b><span>{p.day.runType ? RUN_TYPE_LABEL[p.day.runType] : "Run"}</span>
                  </Link>
                ))}
                {ran.map((x) => (
                  <Link key={x.id} href={`/app/log/${x.id}`} className="did" title={x.name ?? x.sportType}>
                    ✓ {x.distanceM ? `${toDistance(x.distanceM, units).toFixed(1)} ${distanceLabel(units)}` : x.sportType}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {strava && (
        <span className="rl-help">
          {strava.last_sync_error
            ? <>Strava: {strava.last_sync_error} <Link href="/app/you#connections">Fix it</Link></>
            : <>From Strava, updated {ago(strava.last_sync_at) ?? "on connect"}. <Link href="/app/you#connections">Sync now</Link></>}
        </span>
      )}

      {picks.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <h2 className="t-title" style={{ margin: 0 }}>Runs you could take</h2>
            <Link href="/app/explore" className="rl-help">Explore →</Link>
          </div>
          <div className="rl-picks">{picks.map((r) => <RunCard key={r.key} r={r} compact />)}</div>
        </section>
      )}

      {theirsShown.length === 0 && (
        <div className="rl-connect-prompt">
          <span className="t-body-sm">Follow someone and their weeks land on this month.</span>
          <Link href="/app/explore" className="rl-btn rl-btn-primary rl-btn-sm">Find people</Link>
        </div>
      )}
    </main>
  );
}
