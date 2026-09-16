// The nine shapes a day can take, as data. Shared by the week builder (one tap) and the editor, so a
// "Tempo" written in one place is the same run in the other. Minutes are a starting point, not a rule.
import type { Block, ProgramDay } from "@/lib/types";

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function block(kind: Block["kind"], position: number, durationS: number, effort: Block["targetEffort"] = "easy"): Block {
  return { id: uuid(), position, kind, measure: "time", durationS, distanceM: null, targetEffort: effort, targetPaceMin: null, targetPaceMax: null, repeatGroup: null, repeatCount: null };
}
export const steady = (minutes: number, effort: Block["targetEffort"] = "easy"): Block[] => [block("work", 0, Math.round(minutes * 60), effort)];
export function repeats(warm: number, reps: number, workMin: number, restMin: number, cool: number): Block[] {
  const g = uuid();
  return [
    block("warmup", 0, warm * 60),
    { ...block("work", 1, Math.round(workMin * 60), "hard"), repeatGroup: g, repeatCount: reps },
    { ...block("recovery", 2, Math.round(restMin * 60), "easy"), repeatGroup: g, repeatCount: reps },
    block("cooldown", 3, cool * 60),
  ];
}

export type Shape = {
  key: string;
  label: string;
  sub: string;
  kind: ProgramDay["kind"];
  runType: ProgramDay["runType"];
  blocks: () => Block[];
};

export const SHAPES: Shape[] = [
  { key: "easy", label: "Easy", sub: "45 min", kind: "run", runType: "easy", blocks: () => steady(45) },
  { key: "long", label: "Long", sub: "90 min", kind: "run", runType: "long", blocks: () => steady(90) },
  { key: "tempo", label: "Tempo", sub: "20 min steady", kind: "run", runType: "tempo", blocks: () => [block("warmup", 0, 600), block("work", 1, 1200, "moderate"), block("cooldown", 2, 600)] },
  { key: "intervals", label: "Intervals", sub: "6 × 3 min", kind: "run", runType: "intervals", blocks: () => repeats(10, 6, 3, 1.5, 10) },
  { key: "hills", label: "Hills", sub: "8 × 1 min", kind: "run", runType: "intervals", blocks: () => repeats(12, 8, 1, 2, 10) },
  { key: "recovery", label: "Recovery", sub: "25 min", kind: "run", runType: "recovery", blocks: () => steady(25) },
  { key: "race", label: "Race day", sub: "go", kind: "run", runType: "race", blocks: () => steady(60, "all_out") },
  { key: "cross", label: "Cross", sub: "bike, swim, gym", kind: "cross", runType: null, blocks: () => [] },
  { key: "rest", label: "Rest", sub: "means rest", kind: "rest", runType: null, blocks: () => [] },
];

export const shapeByKey = (k: string) => SHAPES.find((s) => s.key === k) ?? null;

/** A run the creator actually did, turned into a day: same length, type guessed from length and pace. */
export function shapeFromRun(durationS: number | null, avgPaceS: number | null): { kind: ProgramDay["kind"]; runType: ProgramDay["runType"]; blocks: Block[] } {
  const mins = Math.max(5, Math.round((durationS ?? 1800) / 60));
  const pace = avgPaceS ?? 360;
  const runType: ProgramDay["runType"] = mins >= 75 ? "long" : pace < 300 ? "tempo" : mins <= 30 ? "recovery" : "easy";
  return { kind: "run", runType, blocks: steady(mins, runType === "tempo" ? "moderate" : "easy") };
}

/** Stretch or shrink every timed block by the same proportion, so a 45 becomes a 60 with its shape intact. */
export function scaleBlocks(blocks: Block[], factor: number): Block[] {
  return blocks.map((b) => (b.durationS ? { ...b, durationS: Math.max(60, Math.round((b.durationS * factor) / 30) * 30) } : b));
}
