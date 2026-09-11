import { createProgramAction } from "@/app/studio/actions";
import { Goal, Level } from "@/lib/types";

export const metadata = { title: "New program" };

const GOAL_LABEL: Record<string, string> = { base: "Base building", "5k": "5K", "10k": "10K", half: "Half marathon", marathon: "Marathon", other: "Something else" };

export default async function NewProgram({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="rl-page rl-stack" style={{ maxWidth: 560, gap: "var(--rl-space-6)" }}>
      <div className="rl-stack" style={{ gap: 2 }}>
        <span className="t-label c-muted">New program</span>
        <h1 className="t-display-lg" style={{ margin: 0 }}>What are they training for?</h1>
        <p className="c-secondary" style={{ margin: 0 }}>Three choices to start. Everything else is editable on the next screen.</p>
      </div>
      <form action={createProgramAction} className="rl-stack" style={{ gap: "var(--rl-space-5)" }}>
        <div className="rl-field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" className="rl-input" placeholder="Base building for busy people" maxLength={80} required autoFocus />
          <span className="rl-help">Say who it&rsquo;s for. &ldquo;Sub-20 in twelve weeks&rdquo; beats &ldquo;5K plan&rdquo;.</span>
        </div>
        <div className="rl-field">
          <label htmlFor="goal">Goal</label>
          <select id="goal" name="goal" className="rl-input" defaultValue="base">
            {Goal.options.map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
          </select>
        </div>
        <div className="rl-row" style={{ alignItems: "stretch" }}>
          <div className="rl-field" style={{ flex: 1 }}>
            <label htmlFor="level">Level</label>
            <select id="level" name="level" className="rl-input" defaultValue="intermediate">
              {Level.options.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
          <div className="rl-field" style={{ flex: 1 }}>
            <label htmlFor="weeks">Weeks</label>
            <input id="weeks" name="weeks" type="number" min={1} max={52} defaultValue={8} className="rl-input" required />
          </div>
        </div>
        {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
        <button type="submit" className="rl-btn rl-btn-primary rl-btn-lg" style={{ alignSelf: "flex-start" }}>Create and open the editor</button>
      </form>
    </main>
  );
}
