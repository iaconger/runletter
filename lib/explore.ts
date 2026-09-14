// Explore: runs you can do today, from real published programs when there are any, and a fictional set
// from the example creators so the screen is never empty during the build. Every card can go to a watch.

import { EXAMPLE_CREATORS, type PortraitName } from "@/components/ui/Ink";
import type { Block, Profile, Program, ProgramDay } from "@/lib/types";

export type ExploreRun = {
  key: string;
  title: string;
  day: ProgramDay;
  creator: { name: string; handle: string; portrait?: PortraitName; avatarUrl?: string | null };
  /** Real creator id (undefined for the fictional set). */
  creatorId?: string;
  /** What the program is for and how many run days a week it asks for; used to rank for the runner. */
  goal?: Program["goal"];
  runsPerWeek?: number;
  programId: string | null; // null for the fictional set
  programTitle: string;
  completions?: number;
  /** Situation photo or the program's cover; falls back to the creator's photo, then the type colour. */
  cover?: string;
  /** URL that returns the .FIT for this run. */
  fitHref: string;
};

const uid = (n: number) => `00000000-0000-4000-8000-${(9000 + n).toString().padStart(12, "0")}`;
function block(n: number, kind: Block["kind"], min: number, effort: Block["targetEffort"], group?: string, reps?: number): Block {
  return { id: uid(n), position: n, kind, measure: "time", durationS: min * 60, distanceM: null, targetEffort: effort, targetPaceMin: null, targetPaceMax: null, repeatGroup: group ?? null, repeatCount: reps ?? null };
}
function run(n: number, runType: ProgramDay["runType"], note: string, blocks: Block[]): ProgramDay {
  return { id: uid(n), week: 1, day: 1, kind: "run", runType, note, blocks };
}

const S = (k: string) => `/api/fit?sample=${k}`;

/** Six runs, one per example creator, in each of their voices. All fictional. */
export const SAMPLE_EXPLORE: ExploreRun[] = [
  { key: "sarah-easy", title: "Sunday easy, coffee after", programTitle: "Base building for busy people", programId: null, goal: "other", runsPerWeek: 3, creator: { name: "Sarah Okafor", handle: "sarah", portrait: "sarah" }, fitHref: S("sarah-easy"), cover: "/brand/photo/situations/sunday-coffee.webp",
    day: run(1, "easy", "Slow enough to talk the whole way. If you can't, slow down. Then coffee.", [block(0, "work", 45, "easy")]) },
  { key: "marcus-club", title: "Club night 5 × 3", programTitle: "First 10K, eight weeks", programId: null, goal: "10k", runsPerWeek: 4, creator: { name: "Marcus Bell", handle: "marcus", portrait: "marcus" }, fitHref: S("marcus-club"), cover: "/brand/photo/situations/club-night.webp",
    day: run(2, "intervals", "Three minutes hard, ninety easy. Fifth one is the one that counts.", [block(0, "warmup", 10, "easy"), block(1, "work", 3, "hard", "g", 5), block(2, "recovery", 1.5, "easy", "g", 5), block(3, "cooldown", 10, "easy")]) },
  { key: "lena-hills", title: "Hills you don't hate", programTitle: "Hills without hating them", programId: null, goal: "other", runsPerWeek: 3, creator: { name: "Lena Vogt", handle: "lena", portrait: "lena" }, fitHref: S("lena-hills"), cover: "/brand/photo/situations/hills.webp",
    day: run(3, "intervals", "Short and steep. Walk down, no shame. The walk is the recovery.", [block(0, "warmup", 12, "easy"), block(1, "work", 1, "hard", "h", 8), block(2, "recovery", 2, "easy", "h", 8), block(3, "cooldown", 10, "easy")]) },
  { key: "diego-tempo", title: "Twenty minutes honest", programTitle: "Sub-20 in twelve weeks", programId: null, goal: "5k", runsPerWeek: 5, creator: { name: "Diego Ferrer", handle: "diego", portrait: "diego" }, fitHref: S("diego-tempo"), cover: "/brand/photo/situations/tempo-dawn.webp",
    day: run(4, "tempo", "Comfortably hard. You could say a sentence, not a paragraph.", [block(0, "warmup", 10, "easy"), block(1, "work", 20, "moderate"), block(2, "cooldown", 10, "easy")]) },
  { key: "priya-return", title: "Run walk run, 30", programTitle: "Back after the break", programId: null, goal: "base", runsPerWeek: 3, creator: { name: "Priya Nair", handle: "priya", portrait: "priya" }, fitHref: S("priya-return"), cover: "/brand/photo/situations/run-walk.webp",
    day: run(5, "recovery", "Two minutes running, one walking. Ten rounds. Nobody is watching.", [block(0, "work", 2, "easy", "r", 10), block(1, "recovery", 1, "easy", "r", 10)]) },
  { key: "tom-track", title: "Tuesday 400s", programTitle: "Tuesday night intervals", programId: null, goal: "5k", runsPerWeek: 4, creator: { name: "Tom Hale", handle: "tom", portrait: "tom" }, fitHref: S("tom-track"), cover: "/brand/photo/situations/track-night.webp",
    day: run(6, "intervals", "Ten of them. Same pace on the last as the first, that's the whole game.", [block(0, "warmup", 12, "easy"), block(1, "work", 1.5, "hard", "t", 10), block(2, "recovery", 1.5, "easy", "t", 10), block(3, "cooldown", 8, "easy")]) },
];

export const sampleExploreByKey = (k: string) => SAMPLE_EXPLORE.find((r) => r.key === k) ?? null;

/** Order runs for a runner: goal match first, then plans that fit their days a week, then the given order. Stable. */
export function rankRuns<T extends Pick<ExploreRun, "goal" | "runsPerWeek">>(runs: T[], me: Pick<Profile, "goal" | "daysPerWeek"> | null | undefined): T[] {
  if (!me || (!me.goal && !me.daysPerWeek)) return runs;
  const goal = me.goal;
  const near = (g?: Program["goal"]) => {
    if (!goal || !g) return 0;
    if (g === goal) return 2;
    if ((goal === "other" || goal === "base") && (g === "other" || g === "base")) return 2;
    if ((goal === "half" && g === "marathon") || (goal === "marathon" && g === "half") || (goal === "5k" && g === "10k") || (goal === "10k" && g === "5k")) return 1;
    return 0;
  };
  const fits = (n?: number) => (me.daysPerWeek && n ? (n <= me.daysPerWeek ? 1 : -1) : 0);
  return runs.map((r, i) => ({ r, i, s: near(r.goal) * 2 + fits(r.runsPerWeek) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.r);
}
