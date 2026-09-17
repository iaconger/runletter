// Plans: fixed blocks, bought once, separate from the subscription. Same builder as your week, any length.
import Link from "next/link";
import { getMyProfile, listMyPrograms } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { Goal, Level, GOAL_LABEL, dayDurationS } from "@/lib/types";
import { createPlanAction } from "@/app/studio/actions";

export const metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

const price = (cents: number | null) => (cents == null || cents === 0 ? "Free" : `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`);

export default async function Plans() {
  const [me, programs] = isConfigured() ? await Promise.all([getMyProfile(), listMyPrograms()]) : [null, []];
  const plans = programs.filter((p) => !p.isLetter);

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(900px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
      <div className="rl-stack" style={{ gap: 2 }}>
        <span className="t-label c-muted rl-kicker">Bought once, not a subscription</span>
        <h1 className="t-display-lg" style={{ margin: 0 }}>Plans</h1>
      </div>
      <p className="c-secondary" style={{ margin: 0, maxWidth: "62ch" }}>
        A plan is a fixed block with a start and an end, say eight weeks to a 10K. Someone buys it once and runs it
        from the day they start. Your week keeps going regardless; these are separate, and entirely optional.
      </p>

      {plans.length > 0 && (
        <ul className="rl-planlist">
          {plans.map((p) => {
            const runs = p.days.filter((d) => d.kind === "run");
            const mins = Math.round(runs.reduce((a, d) => a + dayDurationS(d), 0) / 60);
            const written = new Set(p.days.map((d) => d.week)).size;
            return (
              <li key={p.id}>
                <Link href={`/studio/plans/${p.id}`}>
                  <span className="rl-stack" style={{ gap: 2, minWidth: 0 }}>
                    <b>{p.title}</b>
                    <span className="rl-help">{p.weeks} weeks · {written} written · {runs.length} runs{mins ? ` · ${Math.round(mins / 60)}h` : ""}</span>
                  </span>
                  <span className="rl-row" style={{ gap: 6, alignItems: "center" }}>
                    <span className="rl-chip rl-chip-accent">{price(p.priceCents ?? null)}</span>
                    <span className={`rl-chip ${p.status === "published" ? "rl-chip-success" : ""}`}>{p.status === "published" ? "On your page" : "Draft"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <form action={createPlanAction} className="rl-card" style={{ gap: "var(--rl-space-4)" }}>
        <span className="t-heading">Start a plan</span>
        <div className="rl-row" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
          <div className="rl-field" style={{ flex: 2, minWidth: 220 }}>
            <label htmlFor="ptitle">Call it</label>
            <input id="ptitle" name="title" className="rl-input" placeholder="Eight weeks to a 10K" maxLength={80} required />
          </div>
          <div className="rl-field" style={{ flex: 1, minWidth: 110 }}>
            <label htmlFor="pweeks">Weeks</label>
            <input id="pweeks" name="weeks" type="number" className="rl-input" min={1} max={52} defaultValue={8} />
          </div>
          <div className="rl-field" style={{ flex: 1, minWidth: 110 }}>
            <label htmlFor="pprice">Price</label>
            <input id="pprice" name="price" type="number" className="rl-input" min={0} step={1} defaultValue={29} />
            <span className="rl-help">0 is free</span>
          </div>
        </div>
        <div className="rl-row" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
          <div className="rl-field" style={{ flex: 1, minWidth: 150 }}>
            <label htmlFor="pgoal">Mostly for</label>
            <select id="pgoal" name="goal" className="rl-input" defaultValue="10k">
              {Goal.options.map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
            </select>
          </div>
          <div className="rl-field" style={{ flex: 1, minWidth: 150 }}>
            <label htmlFor="plevel">Level</label>
            <select id="plevel" name="level" className="rl-input" defaultValue="intermediate">
              {Level.options.map((l) => <option key={l} value={l}>{l[0]!.toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="rl-btn rl-btn-primary" style={{ alignSelf: "flex-start" }} disabled={!me}>Build it →</button>
      </form>
    </main>
  );
}
