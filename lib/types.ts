// Domain types. Mirrors supabase/migrations/0001_schema.sql and 02-product/data-model.md.
// When the schema changes, change it here too. Run `npm run db:types` for the generated DB types.

import { z } from "zod";

export const Goal = z.enum(["base", "5k", "10k", "half", "marathon", "other"]);
export const Level = z.enum(["beginner", "intermediate", "advanced"]);
export const StartRule = z.enum(["rolling", "fixed"]);
export const Access = z.enum(["creator_sub", "one_time"]);
export const ProgramStatus = z.enum(["draft", "published", "archived"]);
export const DayKind = z.enum(["run", "rest", "cross"]);
export const RunType = z.enum(["easy", "tempo", "intervals", "long", "recovery", "race"]);
export const BlockKind = z.enum(["warmup", "work", "recovery", "cooldown"]);
export const Measure = z.enum(["time", "distance"]);
export const Effort = z.enum(["easy", "moderate", "hard", "all_out"]);

export const Block = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
  kind: BlockKind,
  measure: Measure,
  durationS: z.number().int().positive().nullable(),
  distanceM: z.number().int().positive().nullable(),
  targetEffort: Effort.nullable(),
  targetPaceMin: z.number().int().positive().nullable(), // sec/km
  targetPaceMax: z.number().int().positive().nullable(),
  repeatGroup: z.string().uuid().nullable(),
  repeatCount: z.number().int().min(2).nullable(),
});
export type Block = z.infer<typeof Block>;

export const ProgramDay = z.object({
  id: z.string().uuid(),
  week: z.number().int().min(1),
  day: z.number().int().min(1).max(7), // 1 = Monday
  kind: DayKind,
  runType: RunType.nullable(),
  note: z.string().default(""),
  blocks: z.array(Block).default([]),
});
export type ProgramDay = z.infer<typeof ProgramDay>;

export const Program = z.object({
  id: z.string().uuid(),
  creatorId: z.string().uuid(),
  title: z.string().min(1).max(80),
  description: z.string().default(""),
  coverUrl: z.string().url().nullable(),
  goal: Goal,
  level: Level,
  weeks: z.number().int().min(1).max(52),
  startRule: StartRule,
  fixedStartDate: z.string().date().nullable(),
  access: Access,
  priceCents: z.number().int().min(0).nullable(),
  status: ProgramStatus,
  days: z.array(ProgramDay).default([]),
});
export type Program = z.infer<typeof Program>;

export const Profile = z.object({
  id: z.string().uuid(),
  handle: z.string().regex(/^[a-z0-9_]{3,24}$/),
  displayName: z.string().min(1).max(60),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().default(""),
  isCreator: z.boolean(),
  links: z.record(z.string(), z.string().url()).default({}),
});
export type Profile = z.infer<typeof Profile>;

/** Total duration of a run day in seconds. Distance-measured blocks are estimated at 6:00/km when no pace is set. */
export function dayDurationS(day: ProgramDay): number {
  return day.blocks.reduce((sum, b) => {
    const reps = b.repeatCount ?? 1;
    const perRep =
      b.measure === "time"
        ? (b.durationS ?? 0)
        : Math.round(((b.distanceM ?? 0) / 1000) * (b.targetPaceMin ?? 360));
    return sum + perRep * reps;
  }, 0);
}

export function fmtMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

export function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_NAMES_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
