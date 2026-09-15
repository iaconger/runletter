// A workout as numbered step cards in groups: Warm up, Session (with "× n" when it repeats), Cool down.
// Each step says how much and at what pace, in the runner's own numbers when we have their 5K time.
// The pattern runners already know from their training apps; the type and colour are ours.

import type { Block, ProgramDay } from "@/lib/types";
import { fmtMinutes } from "@/lib/types";
import { paceLine } from "@/lib/paces";
import { fmtDistanceUnit, type Units } from "@/lib/units";
import { runKey } from "@/components/run/RunPieces";

type Group = { title: string; kind: "warmup" | "session" | "cooldown"; reps: number | null; steps: Block[] };

function amount(b: Block, units: Units = "km") {
  return b.measure === "time" ? fmtMinutes(b.durationS ?? 0) : fmtDistanceUnit(b.distanceM ?? 0, units);
}

/** Warm up steps, then one Session per repeat group (or a plain session of loose work/recovery), then cool down. */
export function groupSteps(blocks: Block[]): Group[] {
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  const groups: Group[] = [];
  let i = 0;
  while (i < sorted.length) {
    const b = sorted[i]!;
    if (b.kind === "warmup" || b.kind === "cooldown") {
      const kind = b.kind;
      const last = groups[groups.length - 1];
      if (last && last.kind === kind) last.steps.push(b);
      else groups.push({ title: kind === "warmup" ? "Warm up" : "Cool down", kind, reps: null, steps: [b] });
      i++;
      continue;
    }
    if (b.repeatGroup) {
      const g: Block[] = [];
      while (i < sorted.length && sorted[i]!.repeatGroup === b.repeatGroup) g.push(sorted[i++]!);
      groups.push({ title: "Session", kind: "session", reps: b.repeatCount ?? null, steps: g });
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && last.kind === "session" && last.reps == null) last.steps.push(b);
    else groups.push({ title: "Session", kind: "session", reps: null, steps: [b] });
    i++;
  }
  return groups;
}

export function StepCards({ day, pace5kS, units = "km" }: { day: ProgramDay; pace5kS?: number | null; units?: Units }) {
  const groups = groupSteps(day.blocks);
  // Number steps across groups before rendering.
  const numbered = groups.map((g, gi) => ({ ...g, start: groups.slice(0, gi).reduce((a, x) => a + x.steps.length, 0) }));
  return (
    <div className="rl-steps-list" data-run={runKey(day)}>
      {numbered.map((g, gi) => (
        <section key={gi} className="rl-stepgroup" data-kind={g.kind}>
          <header>
            <span>{g.title}</span>
            {g.reps && <b>× {g.reps}</b>}
          </header>
          <ol>
            {g.steps.map((b, si) => {
              const n = g.start + si + 1;
              const isRun = b.kind !== "recovery";
              return (
                <li key={b.id}>
                  <span className="n">{n}</span>
                  <span className="body">
                    <b>{amount(b, units)}</b> {b.kind === "recovery" ? "easy jog or walk" : paceLine(b, pace5kS, units)}
                  </span>
                  <span className="tag">{isRun ? "run" : "rest"}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
