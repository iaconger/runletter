// The made-up cast. Everything here is fictional: invented people, invented weeks, invented mileage.
// It exists so the app can be shown to someone who has no account and nothing in it yet — a creator
// being recruited, mostly. Nothing here is written to the database and no real account is touched.
//
// Used by /demo (the public walkthrough), by ?demo=1 on a signed-in screen, and as the fallback on a
// creator page that has not filled up yet.
import { addDays, toISODate, type Block, type Profile, type Program, type ProgramDay } from "@/lib/types";

type RunTypeT = "easy" | "tempo" | "intervals" | "long" | "recovery" | "race";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Stable pseudo-random from a string, so the same demo looks the same on every render. */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };
const pick = <T,>(xs: readonly T[], seed: string) => xs[hash(seed) % xs.length]!;
/** Fixed fake uuids, so demo objects satisfy the same types as real ones. */
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// ─── Creators ────────────────────────────────────────────────────────────────────────────────────

export type DemoShape = [day: number, kind: "run" | "rest" | "cross", runType: RunTypeT | null, note: string, minutes: number];

export type DemoCreator = {
  id: string; handle: string; name: string; avatarUrl: string; coverInk: boolean;
  city: string; tagline: string; bio: string;
  priceCents: number; runners: number;
  links: Record<string, string>;
  /** The seven days they post, week in week out. */
  shape: DemoShape[];
  plans: { id: string; title: string; weeks: number; priceCents: number; goal: Program["goal"]; level: Program["level"]; description: string }[];
  shoes: { brand: string; model: string; colour: string; km: number }[];
};

const P = (name: string, photo: boolean) => (photo ? `/brand/photo/${name}.webp` : `/brand/ink/creator-${name}.svg`);

export const DEMO_CREATORS: DemoCreator[] = [
  {
    id: uid(1), handle: "sarah", name: "Sarah Okafor", avatarUrl: P("sarah", true), coverInk: false,
    city: "Chicago", tagline: "Marathon coach",
    bio: "I run 3:02 on a good day and I have a full-time job. This is the week I am actually doing, written on Sunday night, mistakes and all.",
    priceCents: 700, runners: 1240,
    links: { instagram: "https://example.com/sarah", strava: "https://example.com/sarah" },
    shape: [
      [1, "run", "easy", "45 minutes, all of it conversational. If you can't talk, slow down.", 45],
      [2, "run", "tempo", "20 minutes at threshold after a proper warm-up. Comfortably hard, not hard.", 40],
      [3, "rest", null, "Walk the dog. That counts.", 0],
      [4, "run", "intervals", "6 × 3 min hard, 90 seconds easy between. Even splits beat a fast first one.", 50],
      [5, "run", "recovery", "30 minutes, slower than you want to.", 30],
      [6, "rest", null, "", 0],
      [7, "run", "long", "90 minutes steady. Coffee after, obviously.", 90],
    ],
    plans: [
      { id: uid(101), title: "Eight weeks to a 10K", weeks: 8, priceCents: 2900, goal: "10k", level: "beginner", description: "Four runs a week, one of them long. Written for someone who can already run 20 minutes." },
      { id: uid(102), title: "Marathon build, sixteen weeks", weeks: 16, priceCents: 5900, goal: "marathon", level: "intermediate", description: "The block I run myself, with the long runs where I actually put them." },
    ],
    shoes: [{ brand: "hoka", model: "Clifton", colour: "cobalt", km: 412 }, { brand: "saucony", model: "Endorphin Speed", colour: "amber", km: 188 }, { brand: "nike", model: "Vaporfly", colour: "red", km: 64 }],
  },
  {
    id: uid(2), handle: "marcus", name: "Marcus Bell", avatarUrl: P("marcus", true), coverInk: false,
    city: "Atlanta", tagline: "Run club captain",
    bio: "Thursday night club, Saturday long run, and whatever holds it together in between. Nobody gets dropped.",
    priceCents: 500, runners: 806,
    links: { instagram: "https://example.com/marcus" },
    shape: [
      [1, "rest", null, "", 0],
      [2, "run", "easy", "Easy 5. Legs off the weekend.", 35],
      [3, "run", "intervals", "Track night. 8 × 400 at 5K effort, jog 200.", 45],
      [4, "run", "easy", "Club run. Back of the pack is a fine place to be.", 40],
      [5, "rest", null, "", 0],
      [6, "run", "long", "Saturday long one. Start slower than feels right.", 75],
      [7, "run", "recovery", "Shakeout, 20 minutes, no watch.", 20],
    ],
    plans: [{ id: uid(103), title: "First 10K, eight weeks", weeks: 8, priceCents: 0, goal: "10k", level: "beginner", description: "Free, because the club is free. Three runs a week." }],
    shoes: [{ brand: "brooks", model: "Ghost", colour: "forest", km: 640 }, { brand: "asics", model: "Novablast", colour: "slate", km: 210 }],
  },
  {
    id: uid(3), handle: "lena", name: "Lena Vogt", avatarUrl: P("lena", true), coverInk: false,
    city: "Denver", tagline: "Trail and vert",
    bio: "Hills, mostly. I write the week I'm running in the foothills, and a flat version underneath for everyone who isn't.",
    priceCents: 900, runners: 512,
    links: { strava: "https://example.com/lena", youtube: "https://example.com/lena" },
    shape: [
      [1, "run", "easy", "Flat and easy. Save the legs.", 40],
      [2, "run", "intervals", "8 × 90 seconds uphill, walk down. Effort, not pace.", 50],
      [3, "cross", null, "Bike or swim. An hour, easy.", 60],
      [4, "run", "easy", "Trail if you have one, road if you don't.", 45],
      [5, "rest", null, "", 0],
      [6, "run", "long", "2 hours in the hills. Bring food.", 120],
      [7, "run", "recovery", "Flat 30. Shake it out.", 30],
    ],
    plans: [{ id: uid(104), title: "Hills without hating them", weeks: 6, priceCents: 2400, goal: "base", level: "intermediate", description: "Six weeks of climbing, built so your legs arrive rather than break." }],
    shoes: [{ brand: "hoka", model: "Speedgoat", colour: "amber", km: 388 }, { brand: "salomon", model: "Sense Ride", colour: "forest", km: 502 }],
  },
  {
    id: uid(4), handle: "diego", name: "Diego Ferrer", avatarUrl: P("diego", true), coverInk: false,
    city: "Austin", tagline: "5K speed",
    bio: "Short, sharp, and repeatable. I'm chasing sub-16 and writing every session down on the way.",
    priceCents: 600, runners: 934,
    links: { instagram: "https://example.com/diego", tiktok: "https://example.com/diego" },
    shape: [
      [1, "run", "easy", "Easy 40. Nothing clever.", 40],
      [2, "run", "intervals", "12 × 400 at 5K pace, 60 seconds jog. Last two are the session.", 50],
      [3, "run", "recovery", "25 minutes, properly slow.", 25],
      [4, "run", "tempo", "3 × 8 min at threshold, 2 min float.", 45],
      [5, "rest", null, "", 0],
      [6, "run", "easy", "Easy with 6 × 20s strides at the end.", 40],
      [7, "run", "long", "70 minutes. Yes, even for a 5K.", 70],
    ],
    plans: [{ id: uid(105), title: "Sub-20 in twelve weeks", weeks: 12, priceCents: 3900, goal: "5k", level: "intermediate", description: "Two hard sessions a week and the patience to keep the rest easy." }],
    shoes: [{ brand: "adidas", model: "Adizero Boston", colour: "slate", km: 296 }, { brand: "nike", model: "Vaporfly", colour: "violet", km: 88 }],
  },
  {
    id: uid(5), handle: "priya", name: "Priya Nair", avatarUrl: P("priya", true), coverInk: false,
    city: "Toronto", tagline: "Comeback running",
    bio: "Back after two years off and a stress fracture. The week is deliberately unambitious and that is the whole point.",
    priceCents: 400, runners: 388,
    links: { instagram: "https://example.com/priya" },
    shape: [
      [1, "run", "easy", "Run 4, walk 1, four times through. No shame in the walk.", 25],
      [2, "rest", null, "Strength. Twenty minutes is plenty.", 0],
      [3, "run", "easy", "30 minutes continuous if it feels fine, intervals if not.", 30],
      [4, "rest", null, "", 0],
      [5, "run", "easy", "Same as Wednesday. Boring is working.", 30],
      [6, "rest", null, "", 0],
      [7, "run", "long", "50 minutes, flat, slow.", 50],
    ],
    plans: [{ id: uid(106), title: "Back after the break", weeks: 10, priceCents: 1900, goal: "base", level: "beginner", description: "Ten weeks from nothing to an hour on your feet, without the injury that sent you here." }],
    shoes: [{ brand: "newbalance", model: "1080", colour: "violet", km: 142 }],
  },
  {
    id: uid(6), handle: "tomhale", name: "Tom Hale", avatarUrl: P("tom", false), coverInk: true,
    city: "Portland", tagline: "Tuesday night track",
    bio: "One hard session a week, written properly, with the reasoning. The rest of your week is your business.",
    priceCents: 300, runners: 221,
    links: { strava: "https://example.com/tom" },
    shape: [
      [1, "rest", null, "", 0],
      [2, "run", "intervals", "The session: 5 × 1000 at 10K effort, 2 min jog. Write the splits down.", 55],
      [3, "run", "recovery", "Whatever you have. 20 to 40 minutes, easy.", 30],
      [4, "rest", null, "", 0],
      [5, "run", "easy", "Easy, your call on length.", 40],
      [6, "rest", null, "", 0],
      [7, "run", "long", "Long, your call. An hour is a good floor.", 60],
    ],
    plans: [],
    shoes: [{ brand: "puma", model: "Deviate Nitro", colour: "red", km: 174 }],
  },
];

export const demoCreator = (handle: string) => DEMO_CREATORS.find((c) => c.handle === handle) ?? null;
export const isDemoHandle = (handle: string) => DEMO_CREATORS.some((c) => c.handle === handle);

/** The creator as a Profile, so the real public page can render them unchanged. */
export function demoProfile(c: DemoCreator): Profile {
  return {
    id: c.id, handle: c.handle, displayName: c.name, avatarUrl: c.avatarUrl, coverUrl: null,
    bio: c.bio, isCreator: true, links: c.links, pace5kS: null, stripeChargesEnabled: true,
    goal: null, raceDate: null, daysPerWeek: null, stravaStats: null, stravaGear: null,
    listPublicly: true, units: "km",
  };
}

/** Their seven days, as program days on a given week start. */
export function demoWeekFor(handle: string, weekStart: string): ProgramDay[] {
  const c = demoCreator(handle) ?? DEMO_CREATORS[0]!;
  return c.shape.map(([day, kind, runType, note, minutes]) => ({
    id: `dw-${c.handle}-${weekStart}-${day}`,
    week: 1, day, kind, runType, note,
    blocks: minutes > 0 ? [{
      id: `db-${c.handle}-${day}`, position: 0, kind: "work", measure: "time",
      durationS: minutes * 60, distanceM: null, targetEffort: null,
      targetPaceMin: null, targetPaceMax: null, repeatGroup: null, repeatCount: null,
    } satisfies Block] : [],
  })) as unknown as ProgramDay[];
}

/** Their Letter and their plans, as programs, for the public page. */
export function demoPrograms(c: DemoCreator, weekStart: string): Program[] {
  const letter: Program = {
    id: `dp-${c.handle}`, creatorId: c.id, title: `${c.name.split(" ")[0]}'s week`,
    description: "A new week, every Sunday night.", coverUrl: null, goal: "base", level: "intermediate",
    weeks: 52, startRule: "fixed", fixedStartDate: weekStart, access: "creator_sub", priceCents: c.priceCents,
    status: "published", isLetter: true, days: demoWeekFor(c.handle, weekStart),
  } as unknown as Program;
  const plans = c.plans.map((p) => ({
    id: p.id, creatorId: c.id, title: p.title, description: p.description, coverUrl: null,
    goal: p.goal, level: p.level, weeks: p.weeks, startRule: "on_join", fixedStartDate: null,
    access: "purchase", priceCents: p.priceCents, status: "published", isLetter: false, days: [],
  })) as unknown as Program[];
  return [letter, ...plans];
}

// ─── Runners ─────────────────────────────────────────────────────────────────────────────────────

type R = [name: string, weekKm: number, lastKm: number, days: number[], streak: number, planned: number, done: number, longestKm: number];

const RUNNERS: R[] = [
  ["Alex Mwangi", 68.4, 61.2, [1, 2, 4, 6, 7], 14, 5, 5, 24.1],
  ["Nina Holt", 61.0, 63.8, [1, 3, 4, 6, 7], 9, 5, 4, 21.0],
  ["Yuki Tanabe", 57.2, 44.9, [2, 3, 5, 7], 6, 5, 4, 19.4],
  ["Jo Cardenas", 52.6, 52.1, [1, 2, 4, 7], 22, 5, 5, 18.2],
  ["Ben Okada", 48.9, 55.4, [1, 4, 6, 7], 4, 5, 3, 17.5],
  ["Rae Lindqvist", 46.3, 38.0, [2, 4, 5, 7], 11, 5, 4, 16.0],
  ["Fatima Zaid", 44.1, 43.7, [1, 2, 4, 6], 7, 5, 4, 15.2],
  ["Sam Petrov", 41.8, 47.2, [1, 3, 6, 7], 3, 5, 3, 16.8],
  ["Cora Neel", 39.5, 31.4, [2, 4, 7], 5, 5, 3, 14.6],
  ["Dev Achari", 37.2, 36.8, [1, 4, 5, 7], 18, 5, 4, 13.9],
  ["Hana Brandt", 34.0, 28.5, [2, 5, 7], 1, 5, 3, 13.1],
  ["Owen Blake", 31.6, 34.2, [1, 3, 6], 1, 5, 2, 12.4],
  ["Mia Ferraro", 28.9, 22.0, [2, 4, 7], 6, 5, 3, 11.8],
  ["Luis Ortega", 25.4, 26.1, [1, 5, 7], 4, 5, 2, 10.5],
  ["Ellis Wren", 22.8, 15.9, [3, 6], 1, 5, 2, 9.7],
  ["Nora Kask", 19.3, 21.7, [2, 7], 0, 5, 1, 8.8],
  ["Gus Pell", 16.0, 9.4, [4, 7], 1, 5, 2, 8.0],
  ["Tess Vandal", 12.5, 13.8, [1, 6], 0, 5, 1, 6.2],
];

const handleOf = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 16);

export type DemoRunner = { id: string; handle: string; name: string; avatarUrl: string | null; weekM: number; lastWeekM: number; ranDays: number[]; streak: number; planned: number; done: number; longestM: number };

export const DEMO_RUNNERS: DemoRunner[] = RUNNERS.map(([name, wk, last, days, streak, planned, done, longest], i) => ({
  id: uid(200 + i), handle: handleOf(name), name, avatarUrl: null,
  weekM: Math.round(wk * 1000), lastWeekM: Math.round(last * 1000), ranDays: days, streak, planned, done, longestM: Math.round(longest * 1000),
}));

/** A runner as a Profile, for screens that want the real shape. */
const runnerProfile = (r: DemoRunner): Profile => ({
  id: r.id, handle: r.handle, displayName: r.name, avatarUrl: r.avatarUrl, coverUrl: null, bio: "",
  isCreator: false, links: {}, pace5kS: null, stripeChargesEnabled: false, goal: null, raceDate: null,
  daysPerWeek: null, stravaStats: null, stravaGear: null, listPublicly: true, units: "km",
});

/** The Runners board, as the studio's own screen expects it. */
export function demoBoard(today: string, handle = "sarah") {
  const c = demoCreator(handle) ?? DEMO_CREATORS[0]!;
  const title = `${c.name.split(" ")[0]}'s week`;
  const monday = toISODate(addDays(today, -((new Date(`${today}T00:00:00`).getDay() + 6) % 7)));
  return DEMO_RUNNERS.map((r) => ({
    profile: runnerProfile(r), programTitle: title, week: 12,
    planned: r.planned, done: r.done, extras: [],
    lastRun: toISODate(addDays(monday, Math.max(...r.ranDays) - 1)),
    weekM: r.weekM, lastWeekM: r.lastWeekM, ranDays: r.ranDays, streak: r.streak, longestM: r.longestM,
  }));
}

/** Who is running with a creator, for the faces strip on their public page. */
export function demoCrewFor(handle: string, n = 14) {
  const off = hash(handle) % 4;
  return DEMO_RUNNERS.slice(off, off + n).map((r, i) => ({
    id: r.id, handle: r.handle, name: r.name, avatarUrl: r.avatarUrl,
    since: toISODate(addDays(toISODate(new Date()), -(9 + i * 11))),
  }));
}

/** Their rotation, as the shoes screen expects it. */
export function demoShoesFor(handle: string) {
  const c = demoCreator(handle) ?? DEMO_CREATORS[0]!;
  return c.shoes.map((s, i) => ({
    id: `ds-${c.handle}-${i}`, brand: s.brand, model: s.model, nickname: null as string | null,
    colour: s.colour, stravaGearId: null as string | null, distanceM: s.km * 1000, retired: false,
    imageUrl: null as string | null, buyUrl: null as string | null,
  }));
}

// ─── The runner's own month ──────────────────────────────────────────────────────────────────────

/** Who the demo runner follows. First two are subscriptions, the third came with a plan. */
export const DEMO_FOLLOWING = [DEMO_CREATORS[0]!, DEMO_CREATORS[1]!, DEMO_CREATORS[3]!].map((c, i) => ({
  id: c.id, handle: c.handle, name: c.name, avatarUrl: c.avatarUrl as string | null, subscribed: i < 2,
}));
/** Kept for the older call sites. */
export const DEMO_CREATORS_FOLLOWED = DEMO_FOLLOWING;

export const DEMO_ON_NOW = [
  { enrollmentId: "de1", programId: `dp-sarah`, title: "Sarah's week", isLetter: true, weeks: 52, week: 12, start: "", creator: { name: DEMO_CREATORS[0]!.name, handle: "sarah", avatarUrl: DEMO_CREATORS[0]!.avatarUrl as string | null }, doneThisWeek: 3, runsThisWeek: 5 },
  { enrollmentId: "de2", programId: uid(101), title: "Eight weeks to a 10K", isLetter: false, weeks: 8, week: 3, start: "", creator: { name: DEMO_CREATORS[1]!.name, handle: "marcus", avatarUrl: DEMO_CREATORS[1]!.avatarUrl as string | null }, doneThisWeek: 2, runsThisWeek: 4 },
  { enrollmentId: "de3", programId: uid(105), title: "Sub-20 in twelve weeks", isLetter: false, weeks: 12, week: 7, start: "", creator: { name: DEMO_CREATORS[3]!.name, handle: "diego", avatarUrl: DEMO_CREATORS[3]!.avatarUrl as string | null }, doneThisWeek: 1, runsThisWeek: 5 },
];

export type DemoDay = { date: string; dayId: string; creator: { id: string; handle: string; name: string; avatarUrl: string | null }; programId: string; runType: string | null; kind: string; note: string; minutes: number };

/** Every day the people you follow have posted, laid on real dates so the month grid fills. */
export function demoFollowedDays(from: string, to: string): DemoDay[] {
  const out: DemoDay[] = [];
  for (let d = new Date(`${from}T00:00:00`); iso(d) <= to; d.setDate(d.getDate() + 1)) {
    const dow = ((d.getDay() + 6) % 7) + 1; // 1 = Monday
    for (const c of DEMO_FOLLOWING.slice(0, 2)) {
      const full = demoCreator(c.handle)!;
      const s = full.shape.find(([n]) => n === dow);
      if (!s || s[1] === "rest") continue;
      out.push({
        date: iso(d), dayId: `dd-${c.handle}-${iso(d)}`,
        creator: { id: c.id, handle: c.handle, name: c.name, avatarUrl: c.avatarUrl },
        programId: `dp-${c.handle}`, runType: s[2], kind: s[1], note: s[3], minutes: s[4],
      });
    }
  }
  return out;
}

/** The demo runner's own finished runs, so the ticks are there too. */
export function demoMine(from: string, to: string) {
  const today = toISODate(new Date());
  const out: { id: string; date: string; name: string; distanceM: number | null; durationS: number | null; sportType: string; avgPaceS: number | null; elevationM: number | null; avgHr: number | null; kudos: number | null; polyline: null; stravaActivityId: null }[] = [];
  for (let d = new Date(`${from}T00:00:00`); iso(d) <= to; d.setDate(d.getDate() + 1)) {
    const date = iso(d);
    if (date > today) break;
    const dow = ((d.getDay() + 6) % 7) + 1;
    if (![1, 2, 4, 6, 7].includes(dow)) continue;
    if (hash(date) % 9 === 0) continue; // a missed day here and there, like a real month
    const km = dow === 7 ? 16 + (hash(date) % 5) : dow === 4 ? 10 + (hash(date) % 3) : 7 + (hash(date) % 4);
    const paceS = 300 + (hash(`p${date}`) % 45);
    out.push({
      id: `dm-${date}`, date, name: pick(["Morning run", "Lunch run", "Evening run", "Commute home", "Club night"], date),
      distanceM: km * 1000, durationS: Math.round(km * paceS), sportType: "Run", avgPaceS: paceS,
      elevationM: 10 + (hash(`e${date}`) % 120), avgHr: 138 + (hash(`h${date}`) % 18), kudos: 2 + (hash(`k${date}`) % 24),
      polyline: null, stravaActivityId: null,
    });
  }
  return out;
}

// ─── Kept names, so older call sites keep working ────────────────────────────────────────────────

export const DEMO_CREW = demoCrewFor("sarah");
export const DEMO_SHOES = demoShoesFor("sarah");
export const demoWeek = (weekStart: string) => demoWeekFor("sarah", weekStart);
