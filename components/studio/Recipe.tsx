"use client";
// The recipe: how a creator says a run in the numbers they already use. "10 warm up. 6 × 3 min hard, 90 sec easy.
// 10 cool down." Three rows, steppers, no list of pieces. Anything that doesn't fit this shape falls back to Pieces.

import type { Block } from "@/lib/types";

export type Recipe = {
  warm: number | null; // minutes
  main: { kind: "steady"; min: number; effort: Effort } | { kind: "repeat"; reps: number; onMin: number; onEffort: Effort; offMin: number };
  cool: number | null;
};
type Effort = NonNullable<Block["targetEffort"]>;
const EFFORTS: Effort[] = ["easy", "moderate", "hard", "all_out"];
const EFFORT_LABEL: Record<Effort, string> = { easy: "Easy", moderate: "Moderate", hard: "Hard", all_out: "Max" };
const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const min = (b: Block) => Math.round(((b.durationS ?? 0) / 60) * 2) / 2;

/** Read a recipe out of blocks when they are: [warm up]? then (one work | work+recover repeated) then [cool down]?. All timed. */
export function parseRecipe(blocks: Block[]): Recipe | null {
  const s = [...blocks].sort((a, b) => a.position - b.position);
  if (s.length === 0 || s.some((b) => b.measure !== "time" || b.targetPaceMin != null)) return null;
  let i = 0;
  let warm: number | null = null;
  if (s[i]?.kind === "warmup") warm = min(s[i++]!);
  const a = s[i];
  if (!a || a.kind !== "work") return null;
  let main: Recipe["main"];
  if (a.repeatGroup) {
    const b = s[i + 1];
    if (!b || b.kind !== "recovery" || b.repeatGroup !== a.repeatGroup) return null;
    main = { kind: "repeat", reps: a.repeatCount ?? 2, onMin: min(a), onEffort: a.targetEffort ?? "hard", offMin: min(b) };
    i += 2;
  } else {
    main = { kind: "steady", min: min(a), effort: a.targetEffort ?? "easy" };
    i += 1;
  }
  let cool: number | null = null;
  if (s[i]?.kind === "cooldown") cool = min(s[i++]!);
  if (i !== s.length) return null;
  return { warm, main, cool };
}

/** Blocks from a recipe. Keeps existing ids by role so autosave updates rows instead of replacing them. */
export function recipeToBlocks(r: Recipe, prev: Block[]): Block[] {
  const s = [...prev].sort((a, b) => a.position - b.position);
  const find = (kind: Block["kind"]) => s.find((b) => b.kind === kind);
  const mk = (kind: Block["kind"], mins: number, effort: Effort, extra: Partial<Block> = {}): Block => ({
    id: find(kind)?.id ?? uuid(), position: 0, kind, measure: "time", durationS: Math.round(mins * 60), distanceM: null, targetEffort: effort, targetPaceMin: null, targetPaceMax: null, repeatGroup: null, repeatCount: null, ...extra,
  });
  const out: Block[] = [];
  if (r.warm) out.push(mk("warmup", r.warm, "easy"));
  if (r.main.kind === "steady") out.push(mk("work", r.main.min, r.main.effort));
  else {
    const g = find("work")?.repeatGroup ?? uuid();
    out.push(mk("work", r.main.onMin, r.main.onEffort, { repeatGroup: g, repeatCount: r.main.reps }));
    out.push(mk("recovery", r.main.offMin, "easy", { repeatGroup: g, repeatCount: r.main.reps }));
  }
  if (r.cool) out.push(mk("cooldown", r.cool, "easy"));
  return out.map((b, i) => ({ ...b, position: i }));
}

function Stepper({ value, onChange, step = 1, min: lo = 1, max = 300, unit, label }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string; label: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(lo, Math.round(v / step) * step));
  return (
    <div className="rl-stepper" aria-label={label}>
      <button type="button" aria-label={`Less ${label}`} onClick={() => onChange(clamp(value - step))}>−</button>
      <input type="number" min={lo} max={max} step={step} value={value} onChange={(e) => onChange(clamp(Number(e.target.value) || lo))} aria-label={label} />
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(clamp(value + step))}>+</button>
      {unit && <span className="unit" aria-hidden>{unit}</span>}
    </div>
  );
}

function EffortPick({ value, onChange }: { value: Effort; onChange: (e: Effort) => void }) {
  return (
    <div className="rl-seg" role="radiogroup" aria-label="Effort">
      {EFFORTS.map((x) => (
        <button key={x} type="button" role="radio" aria-checked={value === x} onClick={() => onChange(x)}>{EFFORT_LABEL[x]}</button>
      ))}
    </div>
  );
}

export function RecipeEditor({ recipe, onChange, readOnly }: { recipe: Recipe; onChange: (r: Recipe) => void; readOnly: boolean }) {
  const r = recipe;
  const set = (patch: Partial<Recipe>) => onChange({ ...r, ...patch });
  const total = (r.warm ?? 0) + (r.main.kind === "steady" ? r.main.min : r.main.reps * (r.main.onMin + r.main.offMin)) + (r.cool ?? 0);
  return (
    <div className="rl-recipe" data-readonly={readOnly ? "true" : undefined}>
      <div className="row" data-part="warm">
        <span className="lbl">Warm up</span>
        {r.warm != null ? (
          <div className="ctl">
            <Stepper label="warm up minutes" value={r.warm} onChange={(v) => set({ warm: v })} unit="min" />
            {!readOnly && <button type="button" className="rl-linkbtn muted" onClick={() => set({ warm: null })}>none</button>}
          </div>
        ) : (
          <div className="ctl">{readOnly ? <span className="rl-help">none</span> : <button type="button" className="rl-linkbtn muted" onClick={() => set({ warm: 10 })}>+ 10 min</button>}</div>
        )}
      </div>

      <div className="row main" data-part="main">
        <span className="lbl">{r.main.kind === "steady" ? "Run" : "Repeat"}</span>
        {r.main.kind === "steady" ? (
          <div className="ctl">
            <Stepper label="minutes" value={r.main.min} onChange={(v) => set({ main: { kind: "steady", min: v, effort: (r.main as { effort: Effort }).effort } })} step={5} min={5} unit="min" />
            <EffortPick value={r.main.effort} onChange={(e) => set({ main: { kind: "steady", min: (r.main as { min: number }).min, effort: e } })} />
            {!readOnly && <button type="button" className="rl-linkbtn muted" onClick={() => set({ main: { kind: "repeat", reps: 6, onMin: 3, onEffort: "hard", offMin: 1.5 } })}>make it repeats</button>}
          </div>
        ) : (
          <div className="ctl stack">
            <div className="line">
              <Stepper label="repeats" value={r.main.reps} onChange={(v) => set({ main: { ...(r.main as Extract<Recipe["main"], { kind: "repeat" }>), reps: v } })} min={2} max={40} unit="×" />
              <Stepper label="minutes on" value={r.main.onMin} onChange={(v) => set({ main: { ...(r.main as Extract<Recipe["main"], { kind: "repeat" }>), onMin: v } })} step={0.5} min={0.5} max={60} unit="min" />
              <EffortPick value={r.main.onEffort} onChange={(e) => set({ main: { ...(r.main as Extract<Recipe["main"], { kind: "repeat" }>), onEffort: e } })} />
            </div>
            <div className="line">
              <span className="rl-help">then</span>
              <Stepper label="minutes easy between" value={r.main.offMin} onChange={(v) => set({ main: { ...(r.main as Extract<Recipe["main"], { kind: "repeat" }>), offMin: v } })} step={0.5} min={0.5} max={30} unit="min easy" />
              {!readOnly && <button type="button" className="rl-linkbtn muted" onClick={() => set({ main: { kind: "steady", min: 20, effort: "moderate" } })}>make it one steady piece</button>}
            </div>
          </div>
        )}
      </div>

      <div className="row" data-part="cool">
        <span className="lbl">Cool down</span>
        {r.cool != null ? (
          <div className="ctl">
            <Stepper label="cool down minutes" value={r.cool} onChange={(v) => set({ cool: v })} unit="min" />
            {!readOnly && <button type="button" className="rl-linkbtn muted" onClick={() => set({ cool: null })}>none</button>}
          </div>
        ) : (
          <div className="ctl">{readOnly ? <span className="rl-help">none</span> : <button type="button" className="rl-linkbtn muted" onClick={() => set({ cool: 10 })}>+ 10 min</button>}</div>
        )}
      </div>

      <div className="sum"><span className="t-numeral-lg">{Math.round(total)}</span><span className="rl-help"> min all in</span></div>
    </div>
  );
}
