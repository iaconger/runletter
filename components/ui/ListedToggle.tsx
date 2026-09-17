"use client";
// One switch: whether a runner appears among the faces on the pages of people they follow. Saves on the tap.
import { useTransition, useState } from "react";

export function ListedToggle({ listed, save }: { listed: boolean; save: (on: boolean) => Promise<void> }) {
  const [on, setOn] = useState(listed);
  const [pending, start] = useTransition();
  return (
    <section className="rl-card" style={{ gap: "var(--rl-space-2)" }}>
      <span className="t-label c-muted">Being seen</span>
      <label className="rl-row" style={{ gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(e) => { const v = e.target.checked; setOn(v); start(async () => { await save(v); }); }}
        />
        <span className="t-body-sm">Show me among the runners on the pages of people I follow</span>
      </label>
      <span className="rl-help">Your name and photo only. Turn it off and you still get the runs, you just are not on the wall.</span>
    </section>
  );
}
