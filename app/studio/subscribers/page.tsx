// Runners, as a board. Who ran what this week, who is on a streak, who moved. The creator's people are the
// point of the product, so this screen should feel like a wall chart, not a CRM.
import { Ink } from "@/components/ui/Ink";
import { CrewBoard } from "@/components/studio/CrewBoard";
import { listMyRunners, getMyProfile } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { toISODate } from "@/lib/types";

export const metadata = { title: "Runners" };
export const dynamic = "force-dynamic";


export default async function Runners() {
  const today = toISODate(new Date());
  const [me, rows] = isConfigured() ? await Promise.all([getMyProfile(), listMyRunners(today)]) : [null, []];
  const units = me?.units ?? "km";

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1000px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
      <div className="rl-stack" style={{ gap: 2 }}>
        <span className="t-label c-muted rl-kicker">This week</span>
        <h1 className="t-display-lg" style={{ margin: 0 }}>Your runners</h1>
      </div>

      {rows.length === 0 ? (
        <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-3)", alignItems: "flex-start" }}>
          <Ink name="sequence" style={{ width: "min(100%, 360px)", opacity: 0.8 }} />
          <span className="t-heading">Nobody yet</span>
          <span className="c-secondary">The board fills up as people follow your week. Your own page is the link to hand out.</span>
        </div>
      ) : (
        <CrewBoard rows={rows} units={units} />
      )}
    </main>
  );
}
