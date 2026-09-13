// Effort to pace, per runner. Creators write "easy", "hard"; a runner's current 5K time turns that into their
// own numbers. Bands are fractions of 5K race pace, in the spirit of Daniels' training paces: easy well
// slower, tempo a little slower, intervals around race pace, all out a little faster.

import type { Block } from "@/lib/types";

export type PaceBand = { min: number; max: number }; // seconds per km, min = faster bound

const BANDS: Record<NonNullable<Block["targetEffort"]>, [number, number]> = {
  easy: [1.22, 1.4],
  moderate: [1.05, 1.1],
  hard: [0.98, 1.02],
  all_out: [0.93, 0.97],
};

export const EFFORT_WORDS: Record<NonNullable<Block["targetEffort"]>, string> = {
  easy: "conversational",
  moderate: "comfortably hard",
  hard: "hard",
  all_out: "all out",
};

/** Personal pace band for an effort, from a 5K time in seconds. Null when the runner has no time on file. */
export function paceFor(effort: Block["targetEffort"], pace5kS: number | null | undefined): PaceBand | null {
  if (!pace5kS) return null;
  const race = pace5kS / 5; // s/km at 5K
  const [lo, hi] = BANDS[effort ?? "easy"];
  return { min: Math.round(race * lo), max: Math.round(race * hi) };
}

/** The band a block should use: the creator's written pace wins, else the runner's personal band. */
export function bandFor(b: Block, pace5kS: number | null | undefined): PaceBand | null {
  if (b.targetPaceMin != null && b.targetPaceMax != null && b.targetPaceMin > 0 && b.targetPaceMax > 0) {
    return { min: Math.min(b.targetPaceMin, b.targetPaceMax), max: Math.max(b.targetPaceMin, b.targetPaceMax) };
  }
  return paceFor(b.targetEffort, pace5kS);
}

export const fmtPaceShort = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** "at a conversational pace, 6:05 to 6:58 /km" or, with no time on file, "at a conversational pace". */
export function paceLine(b: Block, pace5kS: number | null | undefined): string {
  const band = bandFor(b, pace5kS);
  const word = EFFORT_WORDS[b.targetEffort ?? "easy"];
  if (!band) return `at a ${word} pace`;
  if (b.targetEffort === "easy" || b.targetEffort == null) return `${word}, no faster than ${fmtPaceShort(band.min)} /km`;
  return `${fmtPaceShort(band.min)} to ${fmtPaceShort(band.max)} /km`;
}

/** Parse "23:45" or "1:02:10" into seconds. */
export function parseTime(v: string): number | null {
  const parts = v.trim().split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n)) || parts.length < 2 || parts.length > 3) return null;
  const [a, b, c] = parts;
  return parts.length === 3 ? a! * 3600 + b! * 60 + c! : a! * 60 + b!;
}
export function fmtTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
