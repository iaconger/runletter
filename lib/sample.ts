// Sample program used by the static screens until the database is wired in.
// Marked as example data in the UI. Replace with Supabase queries in Phase 2.

import type { Block, Program, ProgramDay, Profile } from "./types";

const id = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;

export const sampleCreator: Profile = {
  id: id(1),
  handle: "sarah",
  displayName: "Sarah Okafor",
  avatarUrl: null,
  coverUrl: null,
  bio: "Marathoner, coach, and the person who will make you do your long run. Chicago.",
  isCreator: true,
  links: { instagram: "https://instagram.com/", strava: "https://strava.com/" },
  pace5kS: null,
  stripeChargesEnabled: false,
  goal: null,
  raceDate: null,
  daysPerWeek: null,
  units: "km",
};

function block(p: Partial<Block> & Pick<Block, "kind" | "position">): Block {
  return {
    id: id(100 + p.position),
    measure: "time",
    durationS: null,
    distanceM: null,
    targetEffort: null,
    targetPaceMin: null,
    targetPaceMax: null,
    repeatGroup: null,
    repeatCount: null,
    ...p,
  };
}

function run(week: number, day: number, runType: ProgramDay["runType"], note: string, blocks: Block[]): ProgramDay {
  return { id: id(week * 10 + day), week, day, kind: "run", runType, note, blocks };
}
function rest(week: number, day: number, note = ""): ProgramDay {
  return { id: id(week * 10 + day), week, day, kind: "rest", runType: null, note, blocks: [] };
}

const easy = (min: number) => [block({ kind: "work", position: 0, durationS: min * 60, targetEffort: "easy" })];

const tempo45: Block[] = [
  block({ kind: "warmup", position: 0, durationS: 600, targetEffort: "easy" }),
  block({ kind: "work", position: 1, durationS: 300, targetEffort: "hard", repeatGroup: id(900), repeatCount: 4 }),
  block({ kind: "recovery", position: 2, durationS: 120, targetEffort: "easy", repeatGroup: id(900), repeatCount: 4 }),
  block({ kind: "cooldown", position: 3, durationS: 540, targetEffort: "easy" }),
];

const intervals: Block[] = [
  block({ kind: "warmup", position: 0, durationS: 600, targetEffort: "easy" }),
  block({ kind: "work", position: 1, durationS: 180, targetEffort: "hard", repeatGroup: id(901), repeatCount: 6 }),
  block({ kind: "recovery", position: 2, durationS: 90, targetEffort: "easy", repeatGroup: id(901), repeatCount: 6 }),
  block({ kind: "cooldown", position: 3, durationS: 600, targetEffort: "easy" }),
];

export const sampleProgram: Program = {
  id: id(2),
  creatorId: sampleCreator.id,
  title: "Base building for busy people",
  description:
    "Eight weeks, four runs a week, nothing over 90 minutes. For runners who have a job and want to arrive at a half marathon block with an engine.",
  coverUrl: null,
  goal: "base",
  level: "intermediate",
  weeks: 8,
  startRule: "rolling",
  fixedStartDate: null,
  access: "creator_sub",
  priceCents: null,
  status: "published",
  isLetter: false,
  days: [
    run(3, 1, "easy", "Shake out the weekend. Conversational the whole way.", easy(40)),
    run(3, 2, "intervals", "Six by three. The last two should feel like the first two, that's the whole point.", intervals),
    rest(3, 3, "Rest means rest. Walk the dog, that's it."),
    run(3, 4, "tempo", "This is the one that hurts. Hold the pace on the fourth rep, that's the whole workout.", tempo45),
    run(3, 5, "easy", "Easy thirty. If you feel good, that's the trap. Stay easy.", easy(30)),
    rest(3, 6),
    run(3, 7, "long", "Long run is about time on feet, not pace. If you're chatting, you're doing it right.", easy(90)),
  ],
};

/** The sample "today": week 3, Thursday. */
export const sampleToday = sampleProgram.days.find((d) => d.week === 3 && d.day === 4)!;
export const sampleWeek = sampleProgram.days.filter((d) => d.week === 3);
export const sampleCompletedDays = new Set([1, 2]);
