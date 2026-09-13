import "server-only";
// Garmin: push a workout to Garmin Connect and schedule it on the runner's calendar, so it is on the watch
// with nothing to download. Needs the Garmin Connect Developer Program (Training API). Until the consumer
// key exists this module reports "not enabled" and the queue keeps the rows, so nothing is lost: the day the
// keys land, the queue drains.
// Docs: https://developer.garmin.com/gc-developer-program/training-api/

import type { ProgramDay } from "@/lib/types";
import { expandBlocks } from "@/lib/fit/encode";

const API = "https://apis.garmin.com/training-api/rest";

export function garminEnabled() {
  return !!(process.env.GARMIN_CONSUMER_KEY && process.env.GARMIN_CONSUMER_SECRET);
}

const INTENSITY: Record<string, string> = { warmup: "WARMUP", work: "INTERVAL", recovery: "RECOVERY", cooldown: "COOLDOWN" };
const HR_ZONE: Record<string, number> = { easy: 2, moderate: 3, hard: 4, all_out: 5 };

/** Garmin's workout JSON for one day. Mirrors the .FIT: time or distance, HR zone or a pace range. */
export function garminWorkoutBody(day: ProgramDay, name: string) {
  const steps = expandBlocks(day.blocks).map((b, i) => {
    const hasPace = b.targetPaceMin != null && b.targetPaceMax != null;
    return {
      type: "WorkoutStep",
      stepOrder: i + 1,
      intensity: INTENSITY[b.kind] ?? "INTERVAL",
      description: b.kind === "work" ? "Work" : b.kind[0]!.toUpperCase() + b.kind.slice(1),
      durationType: b.measure === "time" ? "TIME" : "DISTANCE",
      durationValue: b.measure === "time" ? b.durationS : b.distanceM,
      ...(hasPace
        ? { targetType: "PACE", targetValueLow: 1000 / Math.max(b.targetPaceMin!, b.targetPaceMax!), targetValueHigh: 1000 / Math.min(b.targetPaceMin!, b.targetPaceMax!) }
        : b.kind === "work" || b.kind === "recovery"
          ? { targetType: "HEART_RATE_ZONE", targetValue: HR_ZONE[b.targetEffort ?? "easy"] }
          : { targetType: "OPEN" }),
    };
  });
  return { workoutName: name.slice(0, 80), sport: "RUNNING", steps };
}

/**
 * Push one workout and schedule it. Returns the provider's id or throws.
 * Auth is OAuth 1.0a (Garmin's Training API still uses it); the signing lives here once keys exist.
 */
export async function garminPush(_userToken: { token: string; secret: string }, day: ProgramDay, name: string, date: string): Promise<string> {
  if (!garminEnabled()) throw new Error("Garmin is not enabled yet: waiting on Garmin Connect Developer Program keys");
  // TODO(garmin): sign with OAuth 1.0a (consumer key/secret + user token/secret), then:
  //   POST `${API}/workout` with garminWorkoutBody(day, name)  -> { workoutId }
  //   POST `${API}/workout/schedule` with { workoutId, date }
  void API;
  void garminWorkoutBody(day, name);
  void date;
  throw new Error("Garmin push not implemented until keys arrive");
}
