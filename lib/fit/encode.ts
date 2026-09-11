// Encode a program day as a Garmin FIT structured workout file.
// Imports into Garmin Connect and the Coros app. Uses the official Garmin FIT SDK encoder.
// Docs: https://developer.garmin.com/fit/file-types/workout/

import { Encoder, Profile, type Encodable, type FileIdMesg, type WorkoutMesg, type WorkoutStepMesg } from "@garmin/fitsdk";
import type { Block, ProgramDay } from "@/lib/types";

type Intensity = "warmup" | "active" | "rest" | "cooldown";

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
export function encodeWorkout(day: ProgramDay, opts: { name: string; createdAt?: Date }): Uint8Array {
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
    const hasPace = b.targetPaceMin != null && b.targetPaceMax != null;
    // FIT speed target is in m/s * 1000; pace min (faster) maps to the high speed bound.
    const speedHigh = hasPace ? Math.round((1000 / b.targetPaceMin!) * 1000) : undefined;
    const speedLow = hasPace ? Math.round((1000 / b.targetPaceMax!) * 1000) : undefined;

    const step: Encodable<WorkoutStepMesg> = {
      mesgNum: Profile.MesgNum.WORKOUT_STEP,
      messageIndex: i,
      wktStepName: stepName(b, workIndex, steps.filter((s) => s.kind === "work").length).slice(0, 16),
      durationType: isTime ? "time" : "distance",
      durationValue,
      targetType: hasPace ? "speed" : "open",
      ...(hasPace ? { customTargetValueLow: speedLow, customTargetValueHigh: speedHigh } : {}),
      intensity: INTENSITY[b.kind],
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
