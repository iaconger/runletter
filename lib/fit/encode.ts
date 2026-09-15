// Encode a program day as a Garmin FIT structured workout file.
// Imports into Garmin Connect and the Coros app. Uses the official Garmin FIT SDK encoder.
// Docs: https://developer.garmin.com/fit/file-types/workout/
//
// What the watch gets, per step: a name (16 chars), a duration (time or distance), a target and an intensity.
// Targets: if the creator wrote a pace range, that becomes a speed target. Otherwise the effort becomes a
// heart-rate zone (easy Z2, moderate Z3, hard Z4, all out Z5), which every runner's watch already personalises,
// so the creator writes effort once and each runner gets their own numbers.

import { Encoder, Profile, type Encodable, type FileIdMesg, type WorkoutMesg, type WorkoutStepMesg } from "@garmin/fitsdk";
import type { Block, ProgramDay } from "@/lib/types";
import { bandFor } from "@/lib/paces";

type Intensity = "warmup" | "active" | "rest" | "cooldown";

const HR_ZONE: Record<NonNullable<Block["targetEffort"]>, number> = { easy: 2, moderate: 3, hard: 4, all_out: 5 };
export const EFFORT_ZONE_LABEL: Record<NonNullable<Block["targetEffort"]>, string> = { easy: "HR zone 2", moderate: "HR zone 3", hard: "HR zone 4", all_out: "HR zone 5" };

const INTENSITY: Record<Block["kind"], Intensity> = {
  warmup: "warmup",
  work: "active",
  recovery: "rest",
  cooldown: "cooldown",
};

/** Expand repeat groups into a flat list of steps, preserving order. */
export function expandBlocks(blocks: Block[]): Block[] {
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  const out: Block[] = [];
  let i = 0;
  while (i < sorted.length) {
    const b = sorted[i]!;
    if (!b.repeatGroup) {
      out.push(b);
      i += 1;
      continue;
    }
    const group: Block[] = [];
    while (i < sorted.length && sorted[i]!.repeatGroup === b.repeatGroup) {
      group.push(sorted[i]!);
      i += 1;
    }
    const reps = b.repeatCount ?? 1;
    for (let r = 0; r < reps; r += 1) out.push(...group);
  }
  return out;
}

function stepName(b: Block, index: number, total: number): string {
  const base =
    b.kind === "warmup" ? "Warm up" : b.kind === "cooldown" ? "Cool down" : b.kind === "recovery" ? "Recover" : "Work";
  return total > 1 && b.kind === "work" ? `${base} ${index}` : base;
}

/**
 * Build a .FIT workout file for one program day.
 * Returns the raw bytes. Serve with content-type application/vnd.ant.fit and a .fit filename.
 */
export function encodeWorkout(day: ProgramDay, opts: { name: string; createdAt?: Date; pace5kS?: number | null }): Uint8Array {
  if (day.kind !== "run" || day.blocks.length === 0) {
    throw new Error("Only run days with at least one block can be exported.");
  }
  const steps = expandBlocks(day.blocks);
  const encoder = new Encoder();

  const fileId: Encodable<FileIdMesg> = {
    mesgNum: Profile.MesgNum.FILE_ID,
    type: "workout",
    manufacturer: "development",
    product: 0,
    timeCreated: opts.createdAt ?? new Date(),
    serialNumber: 1,
  };
  encoder.writeMesg(fileId);

  const workout: Encodable<WorkoutMesg> = {
    mesgNum: Profile.MesgNum.WORKOUT,
    wktName: opts.name.slice(0, 32),
    sport: "running",
    numValidSteps: steps.length,
  };
  encoder.writeMesg(workout);

  let workIndex = 0;
  steps.forEach((b, i) => {
    if (b.kind === "work") workIndex += 1;
    const isTime = b.measure === "time";
    const durationValue = isTime ? (b.durationS ?? 0) * 1000 : (b.distanceM ?? 0) * 100; // ms or cm per FIT spec
    // A written pace, or the runner's own band from their 5K time. Warm up and cool down stay open.
    const band = b.kind === "work" || b.kind === "recovery" ? bandFor(b, opts.pace5kS) : null;
    const hasPace = !!band;
    // FIT speed target is in m/s * 1000; pace min (faster) maps to the high speed bound.
    const speedHigh = band ? Math.round((1000 / band.min) * 1000) : undefined;
    const speedLow = band ? Math.round((1000 / band.max) * 1000) : undefined;
    // Warm up and cool down stay open: nobody wants a zone alarm while jogging to the start.
    const zone = b.kind === "work" || b.kind === "recovery" ? HR_ZONE[b.targetEffort ?? "easy"] : null;

    const step: Encodable<WorkoutStepMesg> = {
      mesgNum: Profile.MesgNum.WORKOUT_STEP,
      messageIndex: i,
      wktStepName: stepName(b, workIndex, steps.filter((s) => s.kind === "work").length).slice(0, 16),
      durationType: isTime ? "time" : "distance",
      durationValue,
      intensity: INTENSITY[b.kind],
      ...(hasPace
        ? { targetType: "speed", targetValue: 0, customTargetValueLow: speedLow, customTargetValueHigh: speedHigh }
        : zone
          ? { targetType: "heartRate", targetValue: zone }
          : { targetType: "open" }),
    };
    encoder.writeMesg(step);
  });

  return encoder.close();
}

export function fitFilename(programTitle: string, day: ProgramDay): string {
  const slug = programTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${slug}-w${day.week}d${day.day}.fit`;
}

/** Human preview of what the watch will show, one line per step. */
export function watchPreview(day: ProgramDay, pace5kS?: number | null, units: "km" | "mi" = "km"): { name: string; amount: string; target: string; kind: Block["kind"] }[] {
  const steps = expandBlocks(day.blocks);
  const total = steps.filter((s) => s.kind === "work").length;
  let workIndex = 0;
  return steps.map((b) => {
    if (b.kind === "work") workIndex += 1;
    const K = units === "mi" ? 1609.344 : 1000;
    const amount = b.measure === "time" ? `${Math.round((b.durationS ?? 0) / 60)} min` : `${((b.distanceM ?? 0) / K).toFixed(1)} ${units}`;
    const band = b.kind === "work" || b.kind === "recovery" ? bandFor(b, pace5kS) : null;
    const fmt = (s: number) => { const v = Math.round(units === "mi" ? s * 1.609344 : s); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`; };
    const target = band ? `${fmt(band.min)} to ${fmt(band.max)} /${units}` : b.kind === "work" || b.kind === "recovery" ? EFFORT_ZONE_LABEL[b.targetEffort ?? "easy"] : "no target";
    return { name: stepName(b, workIndex, total).slice(0, 16), amount, target, kind: b.kind };
  });
}
