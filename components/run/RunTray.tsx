"use client";
// Runs from the creators you follow. Drag one onto a day, or tap a day chip on phones where drag is awkward.
import { useTransition } from "react";
import { DRAG_TYPE } from "@/components/run/Calendar";
import { addDays, toISODate } from "@/lib/types";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function RunTray({ runs, weekStart, schedule }: {
  runs: { key: string; title: string; runType: string; mins: number; creator: string }[];
  /** Monday of the week the chips schedule into. */
  weekStart: string;
  schedule: (programDayId: string, date: string) => Promise<void>;
}) {
  const [, start] = useTransition();
  return (
    <div className="rl-tray">
      {runs.map((r) => (
        <article key={r.key} className="rl-traycard" data-run={r.runType} draggable
          onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, r.key); e.dataTransfer.setData("text/plain", r.key); e.dataTransfer.effectAllowed = "copy"; }}>
          <span className="t">{r.title}</span>
          <span className="w">{r.creator} · {r.mins} min</span>
          <span className="pick">
            {DOW.map((d, i) => (
              <button key={d} type="button" title={`Put this on ${d}`}
                onClick={() => start(() => { void schedule(r.key, toISODate(addDays(weekStart, i))); })}>{d[0]}</button>
            ))}
          </span>
        </article>
      ))}
    </div>
  );
}

