import { Ink } from "@/components/ui/Ink";
import { Connections } from "@/components/connections/Connections";
import { getMyProfile, listMyRuns } from "@/lib/db/programs";
import { RunLog } from "@/components/run/RunLog";
import { addDays, toISODate } from "@/lib/types";
import { isConfigured } from "@/lib/supabase/server";
import { fmtTime } from "@/lib/paces";
import { savePaceAction } from "../actions";

export const metadata = { title: "You" };
export const dynamic = "force-dynamic";

export default async function You({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const notice = await searchParams;
  const me = isConfigured() ? await getMyProfile() : null;
  const today = toISODate(new Date());
  const log = me ? await listMyRuns(toISODate(addDays(today, -29)), today) : [];
  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <h1 className="t-display-lg" style={{ margin: 0 }}>You</h1>
      <Ink name="route" style={{ width: "min(100%, 300px)", opacity: 0.8, marginTop: "calc(-1 * var(--rl-space-3))" }} />
      <form action={savePaceAction} className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">Your paces</span>
          <span className="t-heading">Current 5K time</span>
        </div>
        <div className="rl-row" style={{ alignItems: "center" }}>
          <input name="time5k" className="rl-input" placeholder="24:30" defaultValue={me?.pace5kS ? fmtTime(me.pace5kS) : ""} style={{ width: 120 }} inputMode="numeric" />
          <button type="submit" className="rl-btn rl-btn-secondary rl-btn-sm">Save</button>
        </div>
        <span className="rl-help">Turns &ldquo;easy&rdquo; and &ldquo;hard&rdquo; into your own paces, on screen and on the watch.</span>
      </form>
      <Connections back="/app/you" notice={notice} />
      {me && (
        <section className="rl-card" style={{ gap: "var(--rl-space-2)" }}>
          <span className="t-heading">Last 30 days</span>
          <RunLog runs={log} empty="Nothing yet. Connect Strava, or tap Sync." />
        </section>
      )}
    </main>
  );
}
