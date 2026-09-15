"use client";
// The calendar. Every week as a row of seven days: what's planned (in the run's colour), what got done, and the
// runs that happened off plan. Seven columns from tablet up, a vertical list per week on phones.
// When `schedule` is passed the days accept drops, so a run from the tray below lands on a date.
import Link from "next/link";
import { useState, useTransition } from "react";
import { dayTitle, runKey } from "@/components/run/RunPieces";
import { addDays, dayDurationS, toISODate, type ProgramDay } from "@/lib/types";

export const DRAG_TYPE = "text/rl-run";

export type CalCell = {
  date: string; // ISO
  day: ProgramDay | null;
  done: boolean;
  extra?: string; // "+5.2 km"
  href?: string;
  /** Set when the day came from the runner dragging it here: they can take it off again. */
  scheduledId?: string;
};
export type CalWeek = { week: number; start: string; cells: CalCell[]; stamp?: "sent" | "scheduled" | "draft"; note?: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dnum = (iso: string) => Number(iso.slice(8, 10));
const mon = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];

export function Calendar({ weeks, today, currentWeek, schedule, unschedule }: {
  weeks: CalWeek[];
  today: string;
  currentWeek?: number | null;
  /** Server action: put this run on this date. Passing it turns the days into drop targets. */
  schedule?: (programDayId: string, date: string) => Promise<void>;
  unschedule?: (id: string) => Promise<void>;
}) {
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();
  const drop = (date: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData(DRAG_TYPE) || e.dataTransfer.getData("text/plain");
    if (id && schedule) start(() => { void schedule(id, date); });
  };
  return (
    <div className="rl-cal" data-dropzone={schedule ? "true" : undefined}>
      <div className="rl-cal-dow" aria-hidden>
        <span />
        {DOW.map((d) => <span key={d}>{d}</span>)}
      </div>
      {weeks.map((w) => {
        const end = toISODate(addDays(w.start, 6));
        const runs = w.cells.filter((c) => c.day?.kind === "run");
        const mins = Math.round(w.cells.reduce((a, c) => a + (c.day ? dayDurationS(c.day) : 0), 0) / 60);
        const done = w.cells.filter((c) => c.done).length;
        const empty = w.cells.every((c) => !c.day && !c.extra) && currentWeek !== w.week && !w.cells.some((c) => c.date === today);
        return (
          <section key={w.week} className={`rl-cal-week${empty ? " empty" : ""}`} data-current={currentWeek === w.week ? "true" : undefined} aria-label={`Week ${w.week}`}>
            <header>
              {w.week > 0 ? <b>Week {w.week}</b> : <b>{mon(w.start)} {dnum(w.start)}</b>}
              <span>{w.week > 0 ? `${mon(w.start)} ${dnum(w.start)} – ` : "to "}{mon(end) === mon(w.start) && w.week > 0 ? "" : `${mon(end)} `}{dnum(end)}</span>
              <span className="tot">{runs.length ? `${done}/${runs.length} runs · ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ""}` : `${mins} min`}` : w.cells.some((c) => c.extra) ? `${w.cells.filter((c) => c.extra).length} active days` : "nothing yet"}</span>
              {w.stamp && <span className="rl-stamp" data-state={w.stamp}>{w.stamp}</span>}
            </header>
            <div className="days">
              {w.cells.map((c, i) => {
                const isToday = c.date === today;
                const past = c.date < today;
                const kind = c.day ? (c.day.kind === "run" ? runKey(c.day) : c.day.kind) : "empty";
                const inner = (
                  <>
                    <span className="d"><i>{DOW[i]}</i>{dnum(c.date)}</span>
                    <span className="t">{c.day ? dayTitle(c.day) : ""}</span>
                    <span className="m">
                      {c.day?.kind === "run" ? `${Math.round(dayDurationS(c.day) / 60)} min` : ""}
                      {c.extra ? <em>{c.extra}</em> : null}
                    </span>
                    {c.done && <span className="ok" aria-label="done">✓</span>}
                  </>
                );
                const cls = ["cell", isToday ? "today" : "", past && !c.done && c.day?.kind === "run" ? "missed" : "", c.done ? "done" : ""].join(" ").trim();
                const dnd = schedule ? {
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(c.date); },
                  onDragLeave: () => setOver((d) => (d === c.date ? null : d)),
                  onDrop: drop(c.date),
                  "data-over": over === c.date ? "true" : undefined,
                } : {};
                const off = c.scheduledId && unschedule ? (
                  <button type="button" className="off" aria-label="Take this run off the day"
                    onClick={(e) => { e.preventDefault(); start(() => { void unschedule(c.scheduledId!); }); }}>×</button>
                ) : null;
                return c.href ? (
                  <div key={c.date} className="cellwrap" {...dnd}>
                    <Link href={c.href} className={cls} data-run={kind}>{inner}</Link>
                    {off}
                  </div>
                ) : (
                  <div key={c.date} className="cellwrap" {...dnd}>
                    <div className={cls} data-run={kind}>{inner}</div>
                    {off}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
