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

// ---------- a day as three answers ----------
// What kind of run, how much of it (distance or time), and how fast. Everything else is derived. This is
// what the studio asks for; blocks are the storage, not the question.

export type DaySpec = {
  type: NonNullable<ProgramDay["runType"]> | "cross" | "rest";
  /** How the main piece is measured. */
  measure: "distance" | "time";
  /** Metres when measure is distance, seconds when it is time. One rep's worth for intervals. */
  amount: number;
  /** Seconds per kilometre for the main piece, or null to leave it to effort words. */
  paceS: number | null;
  effort: Block["targetEffort"];
  /** Intervals only. */
  reps?: number;
  recoveryS?: number;
  /** Minutes either side of the main piece. */
  warmS?: number;
  coolS?: number;
};

const PACE_WINDOW = 8; // seconds either side: a target, not a tightrope

function piece(kind: Block["kind"], position: number, spec: Pick<DaySpec, "measure" | "amount" | "paceS" | "effort">, group?: string, reps?: number): Block {
  const b = block(kind, position, 0, spec.effort);
  return {
    ...b,
    measure: spec.measure,
    durationS: spec.measure === "time" ? Math.round(spec.amount) : null,
    distanceM: spec.measure === "distance" ? Math.round(spec.amount) : null,
    targetPaceMin: spec.paceS ? spec.paceS - PACE_WINDOW : null,
    targetPaceMax: spec.paceS ? spec.paceS + PACE_WINDOW : null,
    repeatGroup: group ?? null,
    repeatCount: group ? reps ?? null : null,
  };
}

/** The three answers, turned into the blocks a watch can run. */
export function buildBlocks(spec: DaySpec): Block[] {
  if (spec.type === "rest" || spec.type === "cross") return [];
  const warm = spec.warmS ?? 0;
  const cool = spec.coolS ?? 0;
  const out: Block[] = [];
  if (warm) out.push(block("warmup", out.length, warm));
  if (spec.type === "intervals" && (spec.reps ?? 1) > 1) {
    const g = uuidish();
    out.push(piece("work", out.length, spec, g, spec.reps));
    out.push({ ...block("recovery", out.length, spec.recoveryS ?? 90), repeatGroup: g, repeatCount: spec.reps ?? 2 });
  } else {
    out.push(piece("work", out.length, spec));
  }
  if (cool) out.push(block("cooldown", out.length, cool));
  return out.map((b, i) => ({ ...b, position: i }));
}
const uuidish = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

/** Read a saved day back as the three answers, so opening it shows what you chose. */
export function specFromDay(day: ProgramDay): DaySpec {
  if (day.kind !== "run") return { type: day.kind === "cross" ? "cross" : "rest", measure: "time", amount: 1800, paceS: null, effort: "easy" };
  const work = day.blocks.find((b) => b.kind === "work") ?? day.blocks[0];
  const rec = day.blocks.find((b) => b.kind === "recovery");
  const warm = day.blocks.find((b) => b.kind === "warmup");
  const cool = day.blocks.find((b) => b.kind === "cooldown");
  const measure: DaySpec["measure"] = work?.measure === "distance" ? "distance" : "time";
  const paceS = work?.targetPaceMin && work.targetPaceMax ? Math.round((work.targetPaceMin + work.targetPaceMax) / 2) : null;
  return {
    type: day.runType ?? "easy",
    measure,
    amount: measure === "distance" ? work?.distanceM ?? 5000 : work?.durationS ?? 2700,
    paceS,
    effort: work?.targetEffort ?? "easy",
    reps: work?.repeatCount ?? 1,
    recoveryS: rec?.durationS ?? 90,
    warmS: warm?.durationS ?? 0,
    coolS: cool?.durationS ?? 0,
  };
}

/** What a shape means as three answers, so tapping "Tempo" opens a sensible tempo. */
export function specForType(type: DaySpec["type"]): DaySpec {
  switch (type) {
    case "long": return { type, measure: "time", amount: 90 * 60, paceS: null, effort: "easy" };
    case "tempo": return { type, measure: "time", amount: 20 * 60, paceS: null, effort: "moderate", warmS: 600, coolS: 600 };
    case "intervals": return { type, measure: "time", amount: 3 * 60, paceS: null, effort: "hard", reps: 6, recoveryS: 90, warmS: 600, coolS: 600 };
    case "recovery": return { type, measure: "time", amount: 25 * 60, paceS: null, effort: "easy" };
    case "race": return { type, measure: "distance", amount: 10000, paceS: null, effort: "all_out" };
    case "cross": case "rest": return { type, measure: "time", amount: 0, paceS: null, effort: "easy" };
    default: return { type: "easy", measure: "time", amount: 45 * 60, paceS: null, effort: "easy" };
  }
}
