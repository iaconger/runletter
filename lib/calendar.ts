// Build calendar weeks over a date range. A program (with its start date) lays planned days onto the grid;
// Strava activities land on their dates whether or not anything was planned. Shared by runner and creator views.
import type { CalWeek } from "@/components/run/Calendar";
import type { ExtraRun } from "@/lib/db/programs";
import { addDays, toISODate, type Program } from "@/lib/types";
import { distanceLabel, fmtDistance, type Units } from "@/lib/units";

export const mondayOf = (iso: string) => { const d = addDays(iso, 0); return toISODate(addDays(iso, -((d.getDay() + 6) % 7))); };

export function activityLabel(x: ExtraRun, units: Units = "km"): string {
  const km = x.distanceM ? `${fmtDistance(x.distanceM, units)} ${distanceLabel(units)}` : x.durationS ? `${Math.round(x.durationS / 60)} min` : "";
  const t = x.sportType;
  const isRun = t === "Run" || t === "TrailRun" || t === "VirtualRun";
  return isRun ? `+${km || "run"}` : `${SPORT_SHORT[t] ?? t}${km ? ` ${km}` : ""}`;
}
const SPORT_SHORT: Record<string, string> = { Ride: "Ride", VirtualRide: "Ride", GravelRide: "Ride", MountainBikeRide: "MTB", Walk: "Walk", Hike: "Hike", Swim: "Swim", WeightTraining: "Gym", Workout: "Workout", Yoga: "Yoga", Elliptical: "Elliptical", Rowing: "Row", NordicSki: "Ski", AlpineSki: "Ski", Soccer: "Football", Tennis: "Tennis" };

export function buildWeeks(opts: {
  /** First Monday to show and how many weeks. */
  from: string;
  weeks: number;
  program?: { program: Program; start: string } | null;
  doneIds: Set<string>;
  extras: ExtraRun[];
  sentWeeks?: Set<number>;
  hideUnsent?: boolean;
  units?: Units;
  hrefFor: (dayId: string | null, date: string, week: number | null, day: number, extra: ExtraRun | null) => string | undefined;
  stampFor?: (week: number) => CalWeek["stamp"];
}): CalWeek[] {
  const { from, weeks, program, doneIds, extras, sentWeeks, hideUnsent, hrefFor, stampFor, units = "km" } = opts;
  const extraByDate = new Map<string, ExtraRun[]>();
  for (const x of extras) extraByDate.set(x.date, [...(extraByDate.get(x.date) ?? []), x]);
  const progWeek = (date: string): { week: number; day: number } | null => {
    if (!program) return null;
    const diff = Math.floor((addDays(date, 0).getTime() - addDays(program.start, 0).getTime()) / 86400000);
    if (diff < 0 || diff >= program.program.weeks * 7) return null;
    return { week: Math.floor(diff / 7) + 1, day: (diff % 7) + 1 };
  };
  return Array.from({ length: weeks }, (_, i) => {
    const ws = toISODate(addDays(from, i * 7));
    const pw = progWeek(ws)?.week ?? null;
    const visible = !hideUnsent || !program?.program.isLetter || (pw != null && (sentWeeks?.has(pw) ?? false));
    return {
      week: pw ?? -(i + 1), // negative = no program week; the component prints the dates instead
      start: ws,
      stamp: pw != null ? stampFor?.(pw) : undefined,
      cells: Array.from({ length: 7 }, (_, d) => {
        const date = toISODate(addDays(ws, d));
        const p = progWeek(date);
        const day = visible && p ? program!.program.days.find((x) => x.week === p.week && x.day === p.day) ?? null : null;
        const xs = extraByDate.get(date) ?? [];
        const extra = xs.length ? xs.map((a) => activityLabel(a, units)).join(" ") : undefined;
        return { date, day, done: !!day && doneIds.has(day.id), extra, href: hrefFor(day?.id ?? null, date, p?.week ?? null, d + 1, xs[0] ?? null) };
      }),
    };
  });
}
