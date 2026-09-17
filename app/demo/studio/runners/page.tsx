// The board, with a crew that exists only here.
import Link from "next/link";
import { CrewBoard } from "@/components/studio/CrewBoard";
import { DemoStudioShell } from "@/components/demo/DemoStudioShell";
import { DEMO_CREATORS, demoBoard } from "@/lib/demo";
import { toISODate } from "@/lib/types";

export const metadata = { title: "A creator's runners" };
export const dynamic = "force-dynamic";

export default function DemoRunners() {
  const c = DEMO_CREATORS[0]!;
  const rows = demoBoard(toISODate(new Date()), c.handle);
  return (
    <DemoStudioShell here="/demo/studio/runners">
      <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1000px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
        <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
          <div className="rl-stack" style={{ gap: 2 }}>
            <span className="t-label c-muted rl-kicker">This week · {c.name}</span>
            <h1 className="t-display-lg" style={{ margin: 0 }}>Your runners</h1>
          </div>
          <span className="rl-help">Showing {rows.length} of {c.runners.toLocaleString()}</span>
        </div>

        <CrewBoard rows={rows} units="km" />

        <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-2)", alignItems: "flex-start" }}>
          <span className="t-heading">This is what people are paying for</span>
          <span className="c-secondary" style={{ maxWidth: "58ch" }}>
            Runs come back from Strava on their own, so the board fills in without anyone logging anything. You can
            see who had a big week and who has gone quiet, and say something about it.
          </span>
          <Link href="/signup?as=creator" className="rl-btn rl-btn-secondary rl-btn-sm">Open a studio</Link>
        </div>
      </main>
    </DemoStudioShell>
  );
}
