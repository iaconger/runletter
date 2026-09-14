// Build calendar weeks from a program, a start date, and what happened. Shared by the runner and creator views.
import type { CalWeek } from "@/components/run/Calendar";
import type { ExtraRun } from "@/lib/db/programs";
import { addDays, toISODate, type Program } from "@/lib/types";

export function buildWeeks(opts: {
  program: Program;
  start: string;
  doneIds: Set<string>;
  extras: ExtraRun[];
  sentWeeks?: Set<number>;
  hideUnsent?: boolean;
  hrefFor: (dayId: string | null, date: string, week: number, day: number) => string | undefined;
  stampFor?: (week: number) => CalWeek["stamp"];
}): CalWeek[] {
  const { program, start, doneIds, extras, sentWeeks, hideUnsent, hrefFor, stampFor } = opts;
  const extraByDate = new Map<string, string>();
  for (const x of extras) {
    const km = x.distanceM ? `${(x.distanceM / 1000).toFixed(x.distanceM >= 10000 ? 0 : 1)} km` : "run";
    extraByDate.set(x.date, extraByDate.has(x.date) ? `${extraByDate.get(x.date)} +${km}` : `+${km}`);
  }
  return Array.from({ length: program.weeks }, (_, i) => i + 1).map((week) => {
    const ws = toISODate(addDays(start, (week - 1) * 7));
    const visible = !hideUnsent || !program.isLetter || (sentWeeks?.has(week) ?? false);
    return {
      week,
      start: ws,
      stamp: stampFor?.(week),
      cells: Array.from({ length: 7 }, (_, d) => {
        const date = toISODate(addDays(ws, d));
        const day = visible ? program.days.find((x) => x.week === week && x.day === d + 1) ?? null : null;
        return { date, day, done: !!day && doneIds.has(day.id), extra: extraByDate.get(date), href: hrefFor(day?.id ?? null, date, week, d + 1) };
      }),
    };
  });
}
