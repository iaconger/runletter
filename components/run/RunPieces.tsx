// Small presentational pieces shared by Today, the program editor and the creator page.

import type { ReactNode } from "react";
import { DAY_NAMES, dayDurationS, fmtMinutes, fmtPace, type Block, type ProgramDay } from "@/lib/types";

export function CreatorNote({ note, by }: { note: string; by: string }) {
  if (!note) return null;
  return (
    <blockquote className="rl-note" style={{ margin: 0 }}>
      <q>{note}</q>
      <cite>{by}</cite>
    </blockquote>
  );
}

const KIND_LABEL: Record<Block["kind"], string> = { warmup: "Warm up", work: "Work", recovery: "Recover", cooldown: "Cool down" };

function blockLine(b: Block): string {
  const amount = b.measure === "time" ? fmtMinutes(b.durationS ?? 0) : `${((b.distanceM ?? 0) / 1000).toFixed(1)} km`;
  const pace = b.targetPaceMin && b.targetPaceMax ? `${fmtPace(b.targetPaceMin)}–${fmtPace(b.targetPaceMax).replace(" /km", "")}` : null;
  const effort = b.targetEffort ? b.targetEffort.replace("_", " ") : null;
  return [amount, pace ?? effort].filter(Boolean).join(" · ");
}

/** The structure of a run as a readable list, repeat groups collapsed to "4 ×". */
export function BlockList({ blocks }: { blocks: Block[] }) {
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  const rows: ReactNode[] = [];
  let i = 0;
  while (i < sorted.length) {
    const b = sorted[i]!;
    if (!b.repeatGroup) {
      rows.push(
        <li key={b.id} className="rl-between" style={{ padding: "10px 0" }}>
          <span className="t-body-medium">{KIND_LABEL[b.kind]}</span>
          <span className="c-secondary">{blockLine(b)}</span>
        </li>,
      );
      i += 1;
      continue;
    }
    const group: Block[] = [];
    while (i < sorted.length && sorted[i]!.repeatGroup === b.repeatGroup) group.push(sorted[i++]!);
    rows.push(
      <li key={b.repeatGroup} style={{ padding: "10px 0" }}>
        <div className="rl-between">
          <span className="t-body-medium">{b.repeatCount} × repeat</span>
        </div>
        <ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0 0 0 var(--rl-space-4)", borderLeft: "1px solid var(--rl-hairline)" }}>
          {group.map((g) => (
            <li key={g.id} className="rl-between" style={{ padding: "6px 0" }}>
              <span>{KIND_LABEL[g.kind]}</span>
              <span className="c-secondary">{blockLine(g)}</span>
            </li>
          ))}
        </ul>
      </li>,
    );
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--rl-hairline)" }}>
      {rows.map((r, idx) => (
        <div key={idx} style={{ borderBottom: "1px solid var(--rl-hairline)" }}>
          {r}
        </div>
      ))}
    </ul>
  );
}

export function dayTitle(day: ProgramDay): string {
  if (day.kind === "rest") return "Rest";
  if (day.kind === "cross") return "Cross training";
  const t = day.runType ?? "run";
  const label = t === "intervals" ? "Intervals" : t.charAt(0).toUpperCase() + t.slice(1);
  const work = day.blocks.filter((b) => b.kind === "work");
  const rep = work.find((b) => b.repeatCount);
  if (rep) return `${label}, ${rep.repeatCount} × ${fmtMinutes(rep.durationS ?? 0).replace(" min", "")}`;
  return `${label} ${fmtMinutes(dayDurationS(day)).replace(" min", "")}`;
}

export function dayShort(day: ProgramDay): string {
  if (day.kind === "rest") return "Rest";
  if (day.kind === "cross") return "Cross";
  const t = day.runType ?? "run";
  return `${t.charAt(0).toUpperCase() + t.slice(1)} ${Math.round(dayDurationS(day) / 60)}`;
}

/** Seven day cells for one week. */
export function WeekStrip({
  days,
  todayDay,
  done,
  selectedDay,
  hrefFor,
}: {
  days: ProgramDay[];
  todayDay?: number;
  done?: Set<number>;
  selectedDay?: number;
  hrefFor?: (day: ProgramDay) => string;
}) {
  return (
    <div className="rl-week" role="list">
      {DAY_NAMES.map((name, idx) => {
        const d = days.find((x) => x.day === idx + 1);
        const attrs = {
          "data-kind": d?.kind ?? "rest",
          "data-today": todayDay === idx + 1 ? "true" : undefined,
          "data-done": done?.has(idx + 1) ? "true" : undefined,
          "data-selected": selectedDay === idx + 1 ? "true" : undefined,
        };
        const inner = (
          <>
            <span className="d">{name}</span>
            <span className="k">{d ? dayShort(d) : "Rest"}</span>
          </>
        );
        return hrefFor && d ? (
          <a key={name} role="listitem" className="rl-day" href={hrefFor(d)} {...attrs} style={{ color: "inherit", textDecoration: "none" }}>
            {inner}
          </a>
        ) : (
          <div key={name} role="listitem" className="rl-day" {...attrs}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
