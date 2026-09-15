import { Ink } from "@/components/ui/Ink";
import { Connections } from "@/components/connections/Connections";
import { Subscriptions } from "@/components/run/Subscriptions";
import { getMyProfile, listMyRuns } from "@/lib/db/programs";
import { RunLog } from "@/components/run/RunLog";
import { addDays, toISODate } from "@/lib/types";
import { isConfigured } from "@/lib/supabase/server";
import { RunningForm } from "@/components/run/RunningForm";
import { UnitsCard } from "@/components/ui/UnitsCard";
import type { StravaStats } from "@/lib/integrations/strava";

export const metadata = { title: "You" };
export const dynamic = "force-dynamic";

export default async function You({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const notice = await searchParams;
  const me = isConfigured() ? await getMyProfile() : null;
  const today = toISODate(new Date());
  const log = me ? await listMyRuns(toISODate(addDays(today, -29)), today) : [];
  const stats = (me?.stravaStats ?? null) as StravaStats | null;
  const km = (m: number) => (m / 1000).toFixed(0);
  const hrs = (s: number) => `${Math.round(s / 3600)} h`;
  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <h1 className="t-display-lg" style={{ margin: 0 }}>You</h1>
      <Ink name="route" style={{ width: "min(100%, 300px)", opacity: 0.8, marginTop: "calc(-1 * var(--rl-space-3))" }} />
      <section className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">Your running</span>
          <span className="t-heading">Goal, days, paces</span>
        </div>
        {me ? <RunningForm profile={me} submitLabel="Save" /> : null}
      </section>
      {stats && (
        <section className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <span className="t-heading">Your running</span>
            <span className="rl-help">From Strava</span>
          </div>
          <div className="rl-totals">
            <div><span className="k">Last 4 weeks</span><span className="n">{km(stats.recent.distanceM)}<small> km</small></span><span className="s">{stats.recent.runs} runs · {hrs(stats.recent.timeS)} · {stats.recent.elevationM} m up</span></div>
            <div><span className="k">This year</span><span className="n">{km(stats.ytd.distanceM)}<small> km</small></span><span className="s">{stats.ytd.runs} runs · {hrs(stats.ytd.timeS)}</span></div>
            <div><span className="k">All time</span><span className="n">{km(stats.all.distanceM)}<small> km</small></span><span className="s">{stats.all.runs} runs</span></div>
          </div>
        </section>
      )}
      {me && <UnitsCard units={me.units} />}
      <Connections back="/app/you" notice={notice} />
      <Subscriptions />
      {me && (
        <section className="rl-card" style={{ gap: "var(--rl-space-2)" }}>
          <span className="t-heading">Last 30 days</span>
          <RunLog runs={log} empty="Nothing yet. Connect Strava, or tap Sync." />
        </section>
      )}
    </main>
  );
}
