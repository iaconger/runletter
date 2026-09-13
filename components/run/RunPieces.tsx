// Small presentational pieces shared by Today, the program editor and the creator page.

import type { ReactNode } from "react";
import { DAY_NAMES, addDays, dayDurationS, fmtMinutes, fmtPace, toISODate, type Block, type ProgramDay } from "@/lib/types";

export function CreatorNote({ note, by, avatarUrl }: { note: string; by: string; avatarUrl?: string | null }) {
  if (!note) return null;
  return (
    <blockquote className="rl-note" style={{ margin: 0 }}>
      <q>{note}</q>
      <cite className={avatarUrl ? "rl-note-by" : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatarUrl && <img src={avatarUrl} alt="" width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover" }} />}
        {by}
      </cite>
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

/** The run-type key used for colour: the run type for runs, "cross" for cross training, nothing for rest/empty. */
export function runKey(d: ProgramDay | undefined): string | undefined {
  if (!d) return undefined;
  if (d.kind === "cross") return "cross";
  if (d.kind === "run") return d.runType ?? "easy";
  return undefined;
}

/** Seven day cells for one week. */
export function WeekStrip({
  days,
  todayDay,
  done,
  selectedDay,
  hrefFor,
  onPick,
  weekStart,
  today,
}: {
  days: ProgramDay[];
  todayDay?: number;
  done?: Set<number>;
  selectedDay?: number;
  hrefFor?: (day: ProgramDay) => string;
  /** Editor mode: every cell is clickable, including empty ones. */
  onPick?: (day: number) => void;
  /** Dated calendar: Monday of this week (YYYY-MM-DD). Cells show the date and today is marked. */
  weekStart?: string | null;
  today?: string;
}) {
  const dateOf = (idx: number) => (weekStart ? addDays(weekStart, idx) : null);
  return (
    <div className="rl-week" role="list">
      {DAY_NAMES.map((name, idx) => {
        const d = days.find((x) => x.day === idx + 1);
        const date = dateOf(idx);
        const iso = date ? toISODate(date) : null;
        const isToday = todayDay === idx + 1 || (!!iso && iso === today);
        const attrs = {
          "data-kind": d?.kind ?? "rest",
          "data-run": runKey(d),
          "data-today": isToday ? "true" : undefined,
          "data-past": iso && today && iso < today ? "true" : undefined,
          "data-done": done?.has(idx + 1) ? "true" : undefined,
          "data-selected": selectedDay === idx + 1 ? "true" : undefined,
        };
        const head = (
          <span className="d">
            {name}
            {date && <span className="n"> {date.getDate()}</span>}
          </span>
        );
        const inner = (
          <>
            {head}
            <span className="k">{d ? dayShort(d) : "Rest"}</span>
          </>
        );
        if (onPick) {
          return (
            <button key={name} type="button" role="listitem" className="rl-day" {...attrs} data-kind={d?.kind ?? "empty"} onClick={() => onPick(idx + 1)} style={{ font: "inherit" }}>
              {head}
              <span className="k" style={!d ? { color: "var(--rl-text-disabled)" } : undefined}>{d ? dayShort(d) : "+"}</span>
            </button>
          );
        }
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
