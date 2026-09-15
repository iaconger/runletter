"use client";
// Miles or kilometres, in settings. Saves on the tap; nothing to submit.
import { useState, useTransition } from "react";
import { saveUnitsAction } from "@/app/welcome/actions";
import type { Units } from "@/lib/units";

export function UnitsCard({ units: initial }: { units: Units }) {
  const [units, setUnits] = useState<Units>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pick(u: Units) {
    if (u === units) return;
    setUnits(u);
    setSaved(false);
    setError(null);
    start(async () => {
      const r = await saveUnitsAction(u);
      if (!r.ok) { setUnits(initial); return setError(r.error ?? "Could not save"); }
      setSaved(true);
    });
  }

  return (
    <section className="rl-card" style={{ gap: "var(--rl-space-3)" }} aria-label="Units">
      <div className="rl-stack" style={{ gap: 2 }}>
        <span className="t-label c-muted">Units</span>
        <span className="t-heading">Distances in</span>
      </div>
      <div className="rl-row" style={{ alignItems: "center", gap: "var(--rl-space-3)" }}>
        <div className="rl-seg" role="radiogroup" aria-label="Units">
          <button type="button" role="radio" aria-checked={units === "km"} onClick={() => pick("km")}>Kilometres</button>
          <button type="button" role="radio" aria-checked={units === "mi"} onClick={() => pick("mi")}>Miles</button>
        </div>
        <span className="rl-help">{pending ? "Saving…" : error ?? (saved ? "Saved" : units === "mi" ? "Miles and 8:35 /mi" : "Kilometres and 5:20 /km")}</span>
      </div>
    </section>
  );
}
