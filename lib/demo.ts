// Dummy data, so the screens can be judged before there is anything real in them. Everything here is
// fictional and only appears with ?demo=1 in the URL, or on the sample creator page. Nothing is written
// to the database, and no real account is touched.
import { addDays, toISODate, type ProgramDay } from "@/lib/types";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const DEMO_CREATORS = [
  { id: "d1", handle: "sarah", name: "Sarah Okafor", avatarUrl: "/brand/photo/sarah.webp", subscribed: true },
  { id: "d2", handle: "marcus", name: "Marcus Bell", avatarUrl: "/brand/photo/marcus.webp", subscribed: true },
  { id: "d3", handle: "priya", name: "Priya Raman", avatarUrl: "/brand/photo/priya.webp", subscribed: false },
];

export const DEMO_ON_NOW = [
  { enrollmentId: "de1", programId: "dp1", title: "Sarah's week", isLetter: true, weeks: 52, week: 12, start: "", creator: DEMO_CREATORS[0]!, doneThisWeek: 3, runsThisWeek: 5 },
  { enrollmentId: "de2", programId: "dp2", title: "Eight weeks to a 10K", isLetter: false, weeks: 8, week: 3, start: "", creator: DEMO_CREATORS[1]!, doneThisWeek: 2, runsThisWeek: 4 },
];

/** A month of a creator's week, laid on real dates so the grid fills. */
export function demoFollowedDays(from: string, to: string) {
  const shape: [number, string, string][] = [
    [1, "easy", "45 min, all talking"], [2, "tempo", "20 min at threshold"], [3, "rest", ""],
    [4, "intervals", "6 × 3 min"], [5, "easy", "Short and slow"], [6, "rest", ""], [0, "long", "90 min, coffee after"],
  ];
  const out: { date: string; dayId: string; creator: typeof DEMO_CREATORS[number]; programId: string; runType: string | null; kind: string; note: string; minutes: number }[] = [];
  for (let d = new Date(`${from}T00:00:00`); iso(d) <= to; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const hit = shape.find(([n]) => n === dow);
    if (!hit) continue;
    const [, type, note] = hit;
    const who = DEMO_CREATORS[dow % 2 === 0 ? 0 : 1]!;
    out.push({
      date: iso(d), dayId: `demo-${iso(d)}`, creator: who, programId: "dp1",
      runType: type === "rest" ? null : type, kind: type === "rest" ? "rest" : "run", note,
      minutes: type === "long" ? 90 : type === "intervals" ? 50 : type === "tempo" ? 40 : 45,
    });
  }
  return out;
}

/** A few of the runner's own runs, so the ticks are there too. */
export function demoMine(from: string, to: string) {
  const km = [8.2, 12.4, 6.1, 16, 9.3, 5.4, 10.1, 7.7];
  const out: { id: string; date: string; name: string; distanceM: number; durationS: number; sportType: string; avgPaceS: number; elevationM: number; avgHr: number; kudos: number; polyline: null; stravaActivityId: null }[] = [];
  let i = 0;
  for (let d = new Date(`${from}T00:00:00`); iso(d) <= to; d.setDate(d.getDate() + 1)) {
    if (iso(d) > toISODate(new Date())) break;
    if ([1, 2, 4, 6].includes(d.getDay())) {
      const dist = km[i % km.length]!;
      out.push({ id: `dm-${iso(d)}`, date: iso(d), name: "Morning run", distanceM: dist * 1000, durationS: Math.round(dist * 330), sportType: "Run", avgPaceS: 320 + (i % 5) * 8, elevationM: Math.round(dist * 8), avgHr: 140 + (i % 8), kudos: 2 + (i % 7), polyline: null, stravaActivityId: null });
      i++;
    }
  }
  return out;
}

export const DEMO_CREW = ["Alex", "Jo", "Sam", "Nina", "Tom", "Rae", "Dev", "Mia"].map((n, i) => ({
  id: `dc${i}`, handle: n.toLowerCase(), name: n, avatarUrl: null as string | null, since: toISODate(addDays(toISODate(new Date()), -i * 9)),
}));

export const DEMO_SHOES = [
  { id: "ds1", brand: "hoka", model: "Clifton", nickname: null, colour: "cobalt", stravaGearId: null, distanceM: 412_000, retired: false, imageUrl: null, buyUrl: null },
  { id: "ds2", brand: "saucony", model: "Endorphin Speed", nickname: null, colour: "amber", stravaGearId: null, distanceM: 188_000, retired: false, imageUrl: null, buyUrl: null },
  { id: "ds3", brand: "nike", model: "Vaporfly", nickname: null, colour: "red", stravaGearId: null, distanceM: 64_000, retired: false, imageUrl: null, buyUrl: null },
];

/** The seven days of a creator's week, for the public page preview. */
export function demoWeek(weekStart: string): ProgramDay[] {
  const spec: [number, ProgramDay["kind"], ProgramDay["runType"], string][] = [
    [1, "run", "easy", "Slow enough to talk the whole way."],
    [2, "run", "tempo", "20 minutes at threshold, and no faster."],
    [3, "rest", null, ""],
    [4, "run", "intervals", "6 × 3 min, 90 seconds easy between."],
    [5, "run", "easy", ""],
    [6, "rest", null, ""],
    [7, "run", "long", "90 minutes. Coffee after, obviously."],
  ];
  return spec.map(([day, kind, runType, note]) => ({
    id: `dw-${weekStart}-${day}`, week: 1, day, kind, runType, note, blocks: [],
  }));
}
