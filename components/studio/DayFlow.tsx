"use client";
// A run, in three answers: what kind, how much, how fast. Distance or time, your choice, and a pace if you
// want one. Intervals ask two more (how many, how long between). Nothing else is on screen.
import { useState } from "react";
import type { DaySpec } from "@/lib/shapes";
import { distanceLabel, paceLabel, toDistance, toPace, type Units } from "@/lib/units";

const MI = 1609.344;
const TYPES: { key: DaySpec["type"]; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "long", label: "Long" },
  { key: "tempo", label: "Tempo" },
  { key: "intervals", label: "Intervals" },
  { key: "recovery", label: "Recovery" },
  { key: "race", label: "Race" },
];
const EFFORTS: { key: NonNullable<DaySpec["effort"]>; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "moderate", label: "Steady" },
  { key: "hard", label: "Hard" },
  { key: "all_out", label: "All out" },
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const parseMmss = (v: string): number | null => {
  const m = v.trim().match(/^(\d{1,2}):([0-5]?\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export function DayFlow({ spec: initial, units = "km", onSave, onCancel, saving }: {
  spec: DaySpec;
  units?: Units;
  onSave: (spec: DaySpec) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [s, setS] = useState<DaySpec>(initial);
  const set = (patch: Partial<DaySpec>) => setS((p) => ({ ...p, ...patch }));
  const U = distanceLabel(units);
  const perUnit = units === "mi" ? MI : 1000;

  // How much: metres or seconds, shown in the creator's own unit.
  const shownAmount = s.measure === "distance" ? (s.amount / perUnit).toFixed(1) : String(Math.round(s.amount / 60));
  const stepAmount = (dir: 1 | -1) => {
    if (s.measure === "distance") set({ amount: Math.max(perUnit * 0.5, s.amount + dir * perUnit * 0.5) });
    else set({ amount: Math.max(300, s.amount + dir * 300) });
  };
  const setMeasure = (measure: DaySpec["measure"]) =>
    set({ measure, amount: measure === "distance" ? Math.max(perUnit, Math.round((s.amount / 300) * perUnit * 0.5)) : Math.max(600, Math.round((s.amount / perUnit) * 330)) });

  const paceShown = s.paceS ? mmss(toPace(s.paceS, units)) : "";
  const setPace = (v: string) => {
    const secs = parseMmss(v);
    if (secs == null) { set({ paceS: null }); return; }
    set({ paceS: units === "mi" ? Math.round(secs / (MI / 1000)) : secs });
  };

  const isRun = s.type !== "rest" && s.type !== "cross";
  const isReps = s.type === "intervals";

  return (
    <div className="rl-dayflow">
      <div className="q">
        <span className="ask">What kind</span>
        <div className="opts">
          {TYPES.map((t) => (
            <button key={t.key} type="button" data-on={s.type === t.key ? "true" : undefined} data-run={t.key}
              onClick={() => set({ type: t.key })}>{t.label}</button>
          ))}
        </div>
      </div>

      {isRun && (
        <>
          <div className="q">
            <span className="ask">{isReps ? "How long is one rep" : "How much"}</span>
            <div className="opts">
              <button type="button" data-on={s.measure === "distance" ? "true" : undefined} onClick={() => setMeasure("distance")}>Distance</button>
              <button type="button" data-on={s.measure === "time" ? "true" : undefined} onClick={() => setMeasure("time")}>Time</button>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => stepAmount(-1)} aria-label="Less">−</button>
              <b>{shownAmount}</b>
              <span>{s.measure === "distance" ? U : "min"}</span>
              <button type="button" onClick={() => stepAmount(1)} aria-label="More">+</button>
            </div>
          </div>

          <div className="q">
            <span className="ask">How fast</span>
            <div className="opts">
              {EFFORTS.map((e) => (
                <button key={e.key} type="button" data-on={!s.paceS && s.effort === e.key ? "true" : undefined}
                  onClick={() => set({ effort: e.key, paceS: null })}>{e.label}</button>
              ))}
            </div>
            <label className="pace">
              <span>or a pace</span>
              <input className="rl-input" inputMode="numeric" placeholder="5:30" defaultValue={paceShown} onBlur={(e) => setPace(e.target.value)} />
              <span>{paceLabel(units)}</span>
            </label>
          </div>

          {isReps && (
            <div className="q">
              <span className="ask">How many, and how long between</span>
              <div className="stepper">
                <button type="button" onClick={() => set({ reps: Math.max(2, (s.reps ?? 6) - 1) })} aria-label="Fewer">−</button>
                <b>{s.reps ?? 6}</b><span>reps</span>
                <button type="button" onClick={() => set({ reps: Math.min(30, (s.reps ?? 6) + 1) })} aria-label="More">+</button>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => set({ recoveryS: Math.max(30, (s.recoveryS ?? 90) - 30) })} aria-label="Less">−</button>
                <b>{mmss(s.recoveryS ?? 90)}</b><span>easy between</span>
                <button type="button" onClick={() => set({ recoveryS: Math.min(900, (s.recoveryS ?? 90) + 30) })} aria-label="More">+</button>
              </div>
            </div>
          )}

          <label className="warm">
            <input type="checkbox" checked={!!(s.warmS || s.coolS)} onChange={(e) => set({ warmS: e.target.checked ? 600 : 0, coolS: e.target.checked ? 600 : 0 })} />
            10 min easy either side
          </label>
        </>
      )}

      <div className="rl-row" style={{ gap: 6 }}>
        <button type="button" className="rl-btn rl-btn-primary rl-btn-sm" disabled={saving} onClick={() => onSave(s)}>{saving ? "Saving" : "Save the day"}</button>
        <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={saving} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/** One line describing the day, the way it will read on the runner's phone. */
export function describe(s: DaySpec, units: Units): string {
  if (s.type === "rest") return "Rest";
  if (s.type === "cross") return "Cross training";
  const amount = s.measure === "distance"
    ? `${(toDistance(s.amount, units)).toFixed(1)} ${distanceLabel(units)}`
    : `${Math.round(s.amount / 60)} min`;
  const pace = s.paceS ? ` at ${mmss(toPace(s.paceS, units))} ${paceLabel(units)}` : "";
  if (s.type === "intervals" && (s.reps ?? 1) > 1) return `${s.reps} × ${amount}${pace}`;
  return `${amount}${pace}`;
}
