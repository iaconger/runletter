// Runners: everyone on your Letter or a plan, with this week's score and anything they ran off-plan.
import { Ink } from "@/components/ui/Ink";
import { listMyRunners } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { toISODate } from "@/lib/types";

export const metadata = { title: "Runners" };
export const dynamic = "force-dynamic";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function Runners() {
  const rows = isConfigured() ? await listMyRunners(toISODate(new Date())) : [];
  return (
    <main className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <h1 className="t-display-lg" style={{ margin: 0 }}>Runners</h1>
      {rows.length === 0 ? (
        <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-3)", alignItems: "flex-start" }}>
          <Ink name="sequence" style={{ width: "min(100%, 360px)", opacity: 0.8 }} />
          <span className="t-heading">Nobody yet</span>
          <span className="c-secondary">Subscriptions open with Stripe. You appear here once you start your Letter.</span>
        </div>
      ) : (
        <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
          {rows.map((r) => (
            <div key={r.profile.id + r.programTitle} className="rl-card" style={{ flexDirection: "row", alignItems: "center", gap: "var(--rl-space-4)", flexWrap: "wrap" }}>
              <span className="rl-avatar" style={{ width: 44, height: 44 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.profile.avatarUrl ? <img src={r.profile.avatarUrl} alt="" /> : <span style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--rl-text-muted)" }}>{r.profile.displayName[0]}</span>}
              </span>
              <div className="rl-stack" style={{ gap: 0, minWidth: 160, flex: 1 }}>
                <span className="t-body-medium">{r.profile.displayName}</span>
                <span className="rl-help">{r.programTitle}{r.week > 0 ? ` · week ${r.week}` : " · starts soon"}</span>
              </div>
              <span className="rl-chip" style={{ fontVariantNumeric: "tabular-nums" }}>{r.done} of {r.planned} runs</span>
              {r.extras.length > 0 && <span className="rl-chip">+{r.extras.length} off plan · {(r.extras.reduce((a, x) => a + (x.distanceM ?? 0), 0) / 1000).toFixed(0)} km</span>}
              <span className="rl-help" style={{ minWidth: 110, textAlign: "right" }}>{r.lastRun ? `Last run ${MONTHS[new Date(r.lastRun).getMonth()]} ${new Date(r.lastRun).getDate()}` : "No runs yet"}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
