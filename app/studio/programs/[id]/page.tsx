// Program editor, static. Three columns from creator-studio.md: program settings, the week grid, the selected day.
// Phase 2 makes this a client component backed by Supabase; the layout and classes stay.

import { notFound } from "next/navigation";
import { BlockBar } from "@/components/run/BlockBar";
import { BlockList, CreatorNote, WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { sampleCreator, sampleProgram } from "@/lib/sample";
import { DAY_NAMES_LONG, dayDurationS, fmtMinutes } from "@/lib/types";

export const metadata = { title: "Edit program" };

export default async function ProgramEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ w?: string; d?: string }>;
}) {
  const { id } = await params;
  if (id !== sampleProgram.id) notFound();
  const { w, d } = await searchParams;
  const week = Number(w ?? 3);
  const dayN = Number(d ?? 4);
  const p = sampleProgram;
  const selected = p.days.find((x) => x.week === week && x.day === dayN);

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: 1240, gap: "var(--rl-space-6)" }}>
      <div className="rl-between">
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">Program</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{p.title}</h1>
        </div>
        <div className="rl-row">
          <span className="rl-chip rl-chip-success">Published</span>
          <button className="rl-btn rl-btn-secondary" type="button" disabled>Preview as follower</button>
        </div>
      </div>

      <div className="rl-editor">
        {/* settings */}
        <section className="rl-card" aria-label="Program settings">
          <span className="t-label c-muted">Settings</span>
          <div className="rl-field"><label>Title</label><input className="rl-input" defaultValue={p.title} readOnly /></div>
          <div className="rl-field"><label>Description</label><textarea className="rl-input" defaultValue={p.description} readOnly /></div>
          <div className="rl-field"><label>Goal</label><input className="rl-input" defaultValue={p.goal} readOnly /></div>
          <div className="rl-field"><label>Level</label><input className="rl-input" defaultValue={p.level} readOnly /></div>
          <div className="rl-field"><label>Weeks</label><input className="rl-input" defaultValue={p.weeks} readOnly /></div>
          <div className="rl-field">
            <label>Start</label>
            <input className="rl-input" defaultValue={p.startRule === "rolling" ? "Rolling, next Monday" : p.fixedStartDate ?? ""} readOnly />
            <span className="rl-help">Rolling: each subscriber starts the Monday after they join.</span>
          </div>
          <div className="rl-field"><label>Access</label><input className="rl-input" defaultValue={p.access === "creator_sub" ? "Included with subscription" : "One-time purchase"} readOnly /></div>
        </section>

        {/* week grid */}
        <section className="rl-stack" aria-label="Weeks" style={{ gap: "var(--rl-space-5)" }}>
          {Array.from({ length: p.weeks }, (_, i) => i + 1).map((wk) => {
            const days = p.days.filter((x) => x.week === wk);
            return (
              <div key={wk} className="rl-weekrow">
                <span className="w">Week {wk}</span>
                {days.length ? (
                  <WeekStrip days={days} selectedDay={wk === week ? dayN : undefined} hrefFor={(x) => `?w=${x.week}&d=${x.day}`} />
                ) : (
                  <div className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "var(--rl-space-3)", color: "var(--rl-text-muted)" }}>
                    Empty week. In phase 2: {wk > 1 ? `copy week ${wk - 1}, or ` : ""}build from a template.
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* selected day */}
        <section className="rl-card" aria-label="Selected day">
          {selected ? (
            <>
              <span className="t-label c-muted">Week {selected.week} · {DAY_NAMES_LONG[selected.day - 1]}</span>
              <h2 className="t-title" style={{ margin: 0 }}>{dayTitle(selected)}</h2>
              {selected.kind === "run" && (
                <>
                  <span className="t-numeral-lg">{fmtMinutes(dayDurationS(selected))}</span>
                  <BlockBar blocks={selected.blocks} legend={false} />
                  <BlockList blocks={selected.blocks} />
                </>
              )}
              <div className="rl-field">
                <label>Note to followers</label>
                <textarea className="rl-input" defaultValue={selected.note} readOnly />
                <span className="rl-help">Shows on the day, in your voice. Keep it to a sentence or two.</span>
              </div>
              <CreatorNote note={selected.note} by={sampleCreator.displayName} />
              <div className="rl-row">
                <button className="rl-btn rl-btn-primary" type="button" disabled>Save day</button>
                <button className="rl-btn rl-btn-ghost" type="button" disabled>Add block</button>
              </div>
            </>
          ) : (
            <span className="c-muted">Pick a day.</span>
          )}
        </section>
      </div>
    </main>
  );
}
