"use client";
// Writing a week, in taps. Seven days down the page. An empty day offers the shapes and, if you ran that day,
// the run you actually did. A written day shows what it is, with longer/shorter and a line of your own.
// Everything saves as you touch it; nothing is sent, nothing is a draft.
import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { SHAPES } from "@/lib/shapes";
import { dayDurationS, type ProgramDay } from "@/lib/types";
import { distanceLabel, fmtDistance, type Units } from "@/lib/units";

const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TYPE_OF = (d: ProgramDay) => (d.kind === "run" ? d.runType ?? "easy" : d.kind);

export type MyRun = { id: string; day: number; name: string | null; distanceM: number | null; durationS: number | null };

type Actions = {
  setShape: (programId: string, week: number, day: number, key: string) => Promise<{ ok: boolean; error?: string }>;
  stretch: (programId: string, week: number, day: number, deltaMin: number) => Promise<{ ok: boolean; error?: string }>;
  note: (programId: string, week: number, day: number, note: string) => Promise<{ ok: boolean; error?: string }>;
  useMyRun: (programId: string, week: number, day: number, extraId: string) => Promise<{ ok: boolean; error?: string }>;
  clearDay: (programId: string, week: number, day: number) => Promise<{ ok: boolean; error?: string }>;
  repeatWeek: (programId: string, week: number) => Promise<{ ok: boolean; error?: string }>;
};

export function WeekBuilder({ programId, week, days, myRuns, dates, units = "km", actions, canRepeat }: {
  programId: string;
  week: number;
  days: ProgramDay[];
  /** The creator's own Strava runs in this week, by day number. */
  myRuns: MyRun[];
  /** ISO date per day 1..7, for the date under each name. */
  dates: string[];
  units?: Units;
  actions: Actions;
  canRepeat: boolean;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useOptimistic(days, (state: ProgramDay[], next: { day: number; value: ProgramDay | null }) =>
    next.value ? [...state.filter((d) => d.day !== next.day), next.value] : state.filter((d) => d.day !== next.day));

  const run = (day: number, fn: () => Promise<{ ok: boolean; error?: string }>, optimisticValue?: ProgramDay | null) => {
    setBusy(day);
    start(async () => {
      if (optimisticValue !== undefined) setOptimistic({ day, value: optimisticValue });
      await fn();
      setBusy(null);
    });
  };

  const filled = optimistic.filter((d) => d.kind !== "rest").length;

  return (
    <div className="rl-stack" style={{ gap: "var(--rl-space-4)" }}>
      <div className="rl-between" style={{ alignItems: "center", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <span className="rl-help" aria-live="polite">
          {optimistic.length === 0 ? "Empty. Tap a day." : `${optimistic.length} of 7 days written${pending ? " · saving" : ""}`}
        </span>
        {canRepeat && (
          <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={pending}
            onClick={() => run(0, () => actions.repeatWeek(programId, week))}>Same as last week</button>
        )}
      </div>

      <ol className="rl-weekbuild">
        {Array.from({ length: 7 }, (_, i) => {
          const dayNo = i + 1;
          const d = optimistic.find((x) => x.day === dayNo) ?? null;
          const mine = myRuns.filter((r) => r.day === dayNo);
          const mins = d ? Math.round(dayDurationS(d) / 60) : 0;
          const working = busy === dayNo;
          return (
            <li key={dayNo} data-run={d ? TYPE_OF(d) : undefined} data-busy={working ? "true" : undefined}>
              <div className="head">
                <span className="nm"><b>{DOW[i]}</b><i>{dates[i]?.slice(8, 10)}</i></span>
                {d && (
                  <span className="rl-row" style={{ gap: 4 }}>
                    <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={pending}
                      onClick={() => run(dayNo, () => actions.clearDay(programId, week, dayNo), null)}>Clear</button>
                  </span>
                )}
              </div>

              {!d ? (
                <div className="pick">
                  {SHAPES.map((s) => (
                    <button key={s.key} type="button" className="rl-shape" data-run={s.kind === "cross" ? "cross" : s.runType ?? undefined} disabled={pending}
                      onClick={() => run(dayNo, () => actions.setShape(programId, week, dayNo, s.key))}>
                      <b>{s.label}</b><span>{s.sub}</span>
                    </button>
                  ))}
                  {mine.map((r) => (
                    <button key={r.id} type="button" className="rl-shape mine" disabled={pending}
                      onClick={() => run(dayNo, () => actions.useMyRun(programId, week, dayNo, r.id))}>
                      <b>What I ran</b>
                      <span>{r.distanceM ? `${fmtDistance(r.distanceM, units)} ${distanceLabel(units)}` : ""}{r.durationS ? ` · ${Math.round(r.durationS / 60)} min` : ""}</span>
                    </button>
                  ))}
                </div>
              ) : d.kind === "rest" ? (
                <div className="said"><span className="what">Rest</span></div>
              ) : (
                <div className="said">
                  <span className="what">
                    {d.kind === "cross" ? "Cross training" : SHAPES.find((s) => s.runType === d.runType && s.kind === "run")?.label ?? "Run"}
                    {mins ? <em>{mins} min</em> : null}
                  </span>
                  {d.kind === "run" && (
                    <span className="rl-row" style={{ gap: 4 }}>
                      <button type="button" className="rl-btn rl-btn-secondary rl-btn-sm" disabled={pending}
                        onClick={() => run(dayNo, () => actions.stretch(programId, week, dayNo, -10))}>− 10 min</button>
                      <button type="button" className="rl-btn rl-btn-secondary rl-btn-sm" disabled={pending}
                        onClick={() => run(dayNo, () => actions.stretch(programId, week, dayNo, 10))}>+ 10 min</button>
                      <Link href={`/studio/programs/${programId}?week=${week}&day=${dayNo}`} className="rl-btn rl-btn-ghost rl-btn-sm">Fine tune</Link>
                    </span>
                  )}
                  <NoteBox value={d.note} disabled={pending} onSave={(v) => run(dayNo, () => actions.note(programId, week, dayNo, v))} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <span className="rl-help">{filled} run{filled === 1 ? "" : "s"} this week. Your followers see this as you write it.</span>
    </div>
  );
}

/** One line about the day. Saves when you leave the box, so typing is never interrupted. */
function NoteBox({ value, onSave, disabled }: { value: string; onSave: (v: string) => void; disabled?: boolean }) {
  const [text, setText] = useState(value);
  return (
    <input
      className="rl-input note"
      placeholder="Say something about it (optional)"
      value={text}
      maxLength={400}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { if (text !== value) onSave(text); }}
    />
  );
}

export { SHORT };
