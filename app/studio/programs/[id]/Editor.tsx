"use client";
// The program editor. Three columns: settings, the week grid, the selected day.
// State lives here; every save goes through a server action and the local copy is updated on success.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { BlockBar } from "@/components/run/BlockBar";
import { CreatorNote, WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { clearDayAction, duplicateWeekAction, saveDayAction, setStatusAction, updateProgramAction } from "@/app/studio/actions";
import { DAY_NAMES_LONG, dayDurationS, fmtMinutes, type Block, type Program, type ProgramDay } from "@/lib/types";

const GOAL_LABEL: Record<Program["goal"], string> = { base: "Base building", "5k": "5K", "10k": "10K", half: "Half marathon", marathon: "Marathon", other: "Other" };
const RUN_TYPES: ProgramDay["runType"][] = ["easy", "tempo", "intervals", "long", "recovery", "race"];
const EFFORTS: NonNullable<Block["targetEffort"]>[] = ["easy", "moderate", "hard", "all_out"];
const KIND_LABEL: Record<Block["kind"], string> = { warmup: "Warm up", work: "Work", recovery: "Recover", cooldown: "Cool down" };

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function emptyDay(week: number, day: number): ProgramDay {
  return { id: uuid(), week, day, kind: "run", runType: "easy", note: "", blocks: [newBlock("work", 0, 40 * 60, "easy")] };
}
function newBlock(kind: Block["kind"], position: number, durationS = 600, effort: Block["targetEffort"] = "easy"): Block {
  return { id: uuid(), position, kind, measure: "time", durationS, distanceM: null, targetEffort: effort, targetPaceMin: null, targetPaceMax: null, repeatGroup: null, repeatCount: null };
}

/** Preset structures so a creator never starts from a blank day. */
const PRESETS: { label: string; runType: ProgramDay["runType"]; blocks: () => Block[] }[] = [
  { label: "Easy 40", runType: "easy", blocks: () => [newBlock("work", 0, 40 * 60, "easy")] },
  { label: "Long 90", runType: "long", blocks: () => [newBlock("work", 0, 90 * 60, "easy")] },
  {
    label: "Tempo 4 × 5",
    runType: "tempo",
    blocks: () => {
      const g = uuid();
      return [newBlock("warmup", 0, 600), { ...newBlock("work", 1, 300, "hard"), repeatGroup: g, repeatCount: 4 }, { ...newBlock("recovery", 2, 120, "easy"), repeatGroup: g, repeatCount: 4 }, newBlock("cooldown", 3, 540)];
    },
  },
  {
    label: "Intervals 6 × 3",
    runType: "intervals",
    blocks: () => {
      const g = uuid();
      return [newBlock("warmup", 0, 600), { ...newBlock("work", 1, 180, "hard"), repeatGroup: g, repeatCount: 6 }, { ...newBlock("recovery", 2, 90, "easy"), repeatGroup: g, repeatCount: 6 }, newBlock("cooldown", 3, 600)];
    },
  },
];

export function Editor({ program: initial, creatorName, handle, readOnly = false }: { program: Program; creatorName: string; handle?: string; readOnly?: boolean }) {
  const [program, setProgram] = useState<Program>(initial);
  const [sel, setSel] = useState<{ week: number; day: number }>(() => {
    const first = initial.days[0];
    return first ? { week: first.week, day: first.day } : { week: 1, day: 1 };
  });
  const [draft, setDraft] = useState<ProgramDay | null>(() => initial.days.find((d) => d.week === sel.week && d.day === sel.day) ?? null);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selected = useMemo(() => program.days.find((d) => d.week === sel.week && d.day === sel.day) ?? null, [program, sel]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function pick(week: number, day: number) {
    if (dirty && !confirm("Discard unsaved changes to this day?")) return;
    setSel({ week, day });
    setDraft(program.days.find((d) => d.week === week && d.day === day) ?? null);
    setDirty(false);
  }

  function edit(next: ProgramDay) {
    setDraft(next);
    setDirty(true);
  }

  // ----- program settings -----
  function saveSetting(patch: Parameters<typeof updateProgramAction>[1] & Partial<Program>) {
    if (readOnly) return;
    setProgram((p) => ({ ...p, ...patch }));
    start(async () => {
      const r = await updateProgramAction(program.id, patch);
      flash(r.ok ? "Saved" : r.error);
    });
  }

  // ----- day -----
  function saveDraft() {
    if (!draft || readOnly) return;
    start(async () => {
      const r = await saveDayAction(program.id, draft);
      if (!r.ok) return flash(r.error);
      const saved = { ...draft, id: r.id ?? draft.id };
      setProgram((p) => ({ ...p, days: [...p.days.filter((d) => !(d.week === saved.week && d.day === saved.day)), saved].sort((a, b) => a.week - b.week || a.day - b.day) }));
      setDraft(saved);
      setDirty(false);
      flash("Day saved");
    });
  }

  function removeDay() {
    if (!draft || readOnly) return;
    if (!confirm("Clear this day?")) return;
    start(async () => {
      const r = await clearDayAction(program.id, draft.week, draft.day);
      if (!r.ok) return flash(r.error);
      setProgram((p) => ({ ...p, days: p.days.filter((d) => !(d.week === draft.week && d.day === draft.day)) }));
      setDraft(null);
      setDirty(false);
      flash("Day cleared");
    });
  }

  function copyWeek(from: number, to: number) {
    if (readOnly) return;
    if (program.days.some((d) => d.week === to) && !confirm(`Replace week ${to} with a copy of week ${from}?`)) return;
    start(async () => {
      const r = await duplicateWeekAction(program.id, from, to);
      if (!r.ok) return flash(r.error);
      const copied = program.days.filter((d) => d.week === from).map((d) => ({ ...d, id: uuid(), week: to }));
      setProgram((p) => ({ ...p, days: [...p.days.filter((d) => d.week !== to), ...copied].sort((a, b) => a.week - b.week || a.day - b.day) }));
      flash(`Week ${from} copied to week ${to}`);
    });
  }

  function setStatus(status: Program["status"]) {
    if (readOnly) return;
    start(async () => {
      const r = await setStatusAction(program.id, status);
      if (!r.ok) return flash(r.error);
      setProgram((p) => ({ ...p, status }));
      flash(status === "published" ? "Published" : "Unpublished");
    });
  }

  // ----- validation before publish -----
  const warnings = useMemo(() => {
    const w: string[] = [];
    const weeksWithDays = new Set(program.days.map((d) => d.week));
    for (let k = 1; k <= program.weeks; k++) if (!weeksWithDays.has(k)) w.push(`Week ${k} is empty`);
    const hardNoNote = program.days.filter((d) => d.kind === "run" && (d.runType === "tempo" || d.runType === "intervals" || d.runType === "race") && !d.note.trim());
    if (hardNoNote.length) w.push(`${hardNoNote.length} hard ${hardNoNote.length === 1 ? "day has" : "days have"} no note`);
    if (["half", "marathon"].includes(program.goal)) {
      const noLong = [...weeksWithDays].filter((k) => !program.days.some((d) => d.week === k && d.runType === "long"));
      if (noLong.length) w.push(`No long run in week${noLong.length > 1 ? "s" : ""} ${noLong.join(", ")}`);
    }
    return w;
  }, [program]);

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: 1280, gap: "var(--rl-space-6)" }}>
      <div className="rl-between" style={{ flexWrap: "wrap" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">{readOnly ? "Example program" : "Program"}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{program.title}</h1>
        </div>
        <div className="rl-row">
          <span className={`rl-chip ${program.status === "published" ? "rl-chip-success" : ""}`}>{program.status}</span>
          {program.status === "published" && handle && <Link href={`/c/${handle}/${program.id}`} className="rl-btn rl-btn-secondary rl-btn-sm">View public page</Link>}
          {program.status !== "published" ? (
            <button className="rl-btn rl-btn-primary" type="button" disabled={readOnly || pending} onClick={() => { if (warnings.length && !confirm(`Publish anyway?\n\n${warnings.join("\n")}`)) return; setStatus("published"); }}>
              Publish
            </button>
          ) : (
            <button className="rl-btn rl-btn-ghost" type="button" disabled={readOnly || pending} onClick={() => setStatus("draft")}>Unpublish</button>
          )}
        </div>
      </div>

      {warnings.length > 0 && !readOnly && (
        <div className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "var(--rl-space-3) var(--rl-space-4)", display: "flex", gap: "var(--rl-space-4)", flexWrap: "wrap" }}>
          <span className="t-label c-muted" style={{ alignSelf: "center" }}>Before you publish</span>
          {warnings.map((w) => <span key={w} className="rl-chip">{w}</span>)}
        </div>
      )}

      <div className="rl-editor">
        {/* ---------- settings ---------- */}
        <section className="rl-card" aria-label="Program settings">
          <span className="t-label c-muted">Settings</span>
          <div className="rl-field"><label>Title</label><input className="rl-input" value={program.title} readOnly={readOnly} maxLength={80} onChange={(e) => setProgram({ ...program, title: e.target.value })} onBlur={(e) => e.target.value.trim() && e.target.value !== initial.title && saveSetting({ title: e.target.value.trim() })} /></div>
          <div className="rl-field"><label>Description</label><textarea className="rl-input" value={program.description} readOnly={readOnly} onChange={(e) => setProgram({ ...program, description: e.target.value })} onBlur={(e) => saveSetting({ description: e.target.value })} /></div>
          <div className="rl-field"><label>Goal</label>
            <select className="rl-input" value={program.goal} disabled={readOnly} onChange={(e) => saveSetting({ goal: e.target.value as Program["goal"] })}>
              {(Object.keys(GOAL_LABEL) as Program["goal"][]).map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
            </select>
          </div>
          <div className="rl-field"><label>Level</label>
            <select className="rl-input" value={program.level} disabled={readOnly} onChange={(e) => saveSetting({ level: e.target.value as Program["level"] })}>
              {(["beginner", "intermediate", "advanced"] as const).map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
          <div className="rl-field"><label>Weeks</label><input className="rl-input" type="number" min={1} max={52} value={program.weeks} readOnly={readOnly} onChange={(e) => setProgram({ ...program, weeks: Number(e.target.value) || 1 })} onBlur={(e) => saveSetting({ weeks: Math.min(52, Math.max(1, Number(e.target.value) || 1)) })} /></div>
          <div className="rl-field"><label>Start</label>
            <select className="rl-input" value={program.startRule} disabled={readOnly} onChange={(e) => saveSetting({ startRule: e.target.value as Program["startRule"], ...(e.target.value === "rolling" ? { fixedStartDate: null } : {}) })}>
              <option value="rolling">Rolling: each subscriber starts next Monday</option>
              <option value="fixed">Fixed date: everyone starts together</option>
            </select>
            {program.startRule === "fixed" && <input className="rl-input" type="date" value={program.fixedStartDate ?? ""} disabled={readOnly} onChange={(e) => saveSetting({ fixedStartDate: e.target.value || null })} />}
          </div>
          <div className="rl-field"><label>Access</label>
            <select className="rl-input" value={program.access} disabled={readOnly} onChange={(e) => saveSetting({ access: e.target.value as Program["access"], ...(e.target.value === "creator_sub" ? { priceCents: null } : { priceCents: program.priceCents ?? 2900 }) })}>
              <option value="creator_sub">Included with your subscription</option>
              <option value="one_time">One-time purchase</option>
            </select>
            {program.access === "one_time" && (
              <div className="rl-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                <span className="c-muted">$</span>
                <input className="rl-input" type="number" min={0} step={1} value={Math.round((program.priceCents ?? 0) / 100)} disabled={readOnly} onChange={(e) => setProgram({ ...program, priceCents: Math.round(Number(e.target.value) * 100) })} onBlur={(e) => saveSetting({ priceCents: Math.round(Number(e.target.value) * 100) })} />
              </div>
            )}
          </div>
        </section>

        {/* ---------- week grid ---------- */}
        <section className="rl-stack" aria-label="Weeks" style={{ gap: "var(--rl-space-5)" }}>
          {Array.from({ length: program.weeks }, (_, i) => i + 1).map((wk) => {
            const days = program.days.filter((x) => x.week === wk);
            const prevHasDays = wk > 1 && program.days.some((x) => x.week === wk - 1);
            return (
              <div key={wk} className="rl-weekrow">
                <span className="w">Week {wk}</span>
                <div className="rl-stack" style={{ gap: 6 }}>
                  <WeekStrip days={days} selectedDay={wk === sel.week ? sel.day : undefined} onPick={(d) => pick(wk, d)} />
                  {!readOnly && (
                    <div className="rl-row" style={{ gap: 4 }}>
                      {prevHasDays && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={pending} onClick={() => copyWeek(wk - 1, wk)}>Copy week {wk - 1} here</button>}
                      {days.length > 0 && wk < program.weeks && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={pending} onClick={() => copyWeek(wk, wk + 1)}>Copy to week {wk + 1}</button>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* ---------- selected day ---------- */}
        <section className="rl-card" aria-label="Selected day">
          <div className="rl-between">
            <span className="t-label c-muted">Week {sel.week} · {DAY_NAMES_LONG[sel.day - 1]}</span>
            {draft && !readOnly && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={removeDay} disabled={pending}>Clear</button>}
          </div>

          {!draft ? (
            <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
              <span className="c-secondary">Nothing here yet. Start from a shape:</span>
              <div className="rl-row">
                {PRESETS.map((p) => (
                  <button key={p.label} type="button" className="rl-chip" style={{ cursor: "pointer" }} disabled={readOnly} onClick={() => edit({ ...emptyDay(sel.week, sel.day), runType: p.runType, blocks: p.blocks() })}>{p.label}</button>
                ))}
                <button type="button" className="rl-chip" style={{ cursor: "pointer" }} disabled={readOnly} onClick={() => edit({ ...emptyDay(sel.week, sel.day), kind: "rest", runType: null, blocks: [] })}>Rest</button>
              </div>
            </div>
          ) : (
            <>
              <div className="rl-row">
                {(["run", "rest", "cross"] as const).map((k) => (
                  <button key={k} type="button" className={`rl-chip ${draft.kind === k ? "rl-chip-on" : ""}`} style={{ cursor: "pointer" }} disabled={readOnly} onClick={() => edit({ ...draft, kind: k, runType: k === "run" ? draft.runType ?? "easy" : null, blocks: k === "run" ? (draft.blocks.length ? draft.blocks : [newBlock("work", 0, 40 * 60, "easy")]) : [] })}>{k[0].toUpperCase() + k.slice(1)}</button>
                ))}
              </div>

              {draft.kind === "run" && (
                <>
                  <div className="rl-field"><label>Run type</label>
                    <select className="rl-input" value={draft.runType ?? "easy"} disabled={readOnly} onChange={(e) => edit({ ...draft, runType: e.target.value as ProgramDay["runType"] })}>
                      {RUN_TYPES.map((t) => <option key={t!} value={t!}>{t![0].toUpperCase() + t!.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="rl-between"><span className="t-title">{dayTitle(draft)}</span><span className="t-numeral-lg">{fmtMinutes(dayDurationS(draft))}</span></div>
                  <BlockBar blocks={draft.blocks} legend={false} />
                  <BlocksEditor blocks={draft.blocks} readOnly={readOnly} onChange={(blocks) => edit({ ...draft, blocks })} />
                </>
              )}

              <div className="rl-field">
                <label>Note to followers</label>
                <textarea className="rl-input" value={draft.note} readOnly={readOnly} maxLength={400} onChange={(e) => edit({ ...draft, note: e.target.value })} placeholder={draft.kind === "rest" ? "Rest means rest. Walk the dog, that's it." : "Why this run, what it should feel like, what to ignore."} />
                <span className="rl-help">Shows on the day, in your voice. One or two sentences.</span>
              </div>
              {draft.note && <CreatorNote note={draft.note} by={creatorName} />}

              {!readOnly && (
                <div className="rl-row">
                  <button type="button" className="rl-btn rl-btn-primary" disabled={!dirty || pending} onClick={saveDraft}>{pending ? "Saving…" : dirty ? "Save day" : "Saved"}</button>
                  {dirty && <button type="button" className="rl-btn rl-btn-ghost" onClick={() => { setDraft(selected); setDirty(false); }}>Discard</button>}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {toast && <div className="rl-toast" role="status" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}>{toast}</div>}
    </main>
  );
}

// ---------- blocks ----------

function BlocksEditor({ blocks, onChange, readOnly }: { blocks: Block[]; onChange: (b: Block[]) => void; readOnly: boolean }) {
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  const renumber = (list: Block[]) => list.map((b, i) => ({ ...b, position: i }));
  const update = (id: string, patch: Partial<Block>) => onChange(renumber(sorted.map((b) => (b.id === id ? { ...b, ...patch } : b))));
  const remove = (id: string) => onChange(renumber(sorted.filter((b) => b.id !== id)));
  const move = (id: string, dir: -1 | 1) => {
    const i = sorted.findIndex((b) => b.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(renumber(next));
  };
  const add = (kind: Block["kind"]) => onChange(renumber([...sorted, newBlock(kind, sorted.length, kind === "work" ? 300 : 600, kind === "work" ? "hard" : "easy")]));
  const addRepeat = () => {
    const g = uuid();
    onChange(renumber([...sorted, { ...newBlock("work", sorted.length, 300, "hard"), repeatGroup: g, repeatCount: 4 }, { ...newBlock("recovery", sorted.length + 1, 120, "easy"), repeatGroup: g, repeatCount: 4 }]));
  };
  const setRepeatCount = (group: string, n: number) => onChange(sorted.map((b) => (b.repeatGroup === group ? { ...b, repeatCount: Math.max(2, n) } : b)));

  // group consecutive repeat blocks for display
  const rows: { group: string | null; items: Block[] }[] = [];
  for (const b of sorted) {
    const last = rows[rows.length - 1];
    if (b.repeatGroup && last && last.group === b.repeatGroup) last.items.push(b);
    else rows.push({ group: b.repeatGroup, items: [b] });
  }

  return (
    <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
      {rows.map((row) => (
        <div key={row.group ?? row.items[0]!.id} style={row.group ? { borderLeft: "2px solid var(--rl-hairline)", paddingLeft: "var(--rl-space-3)", display: "flex", flexDirection: "column", gap: 6 } : { display: "flex", flexDirection: "column", gap: 6 }}>
          {row.group && (
            <div className="rl-row" style={{ gap: 6 }}>
              <input className="rl-input" type="number" min={2} max={30} value={row.items[0]!.repeatCount ?? 2} disabled={readOnly} style={{ width: 64 }} onChange={(e) => setRepeatCount(row.group!, Number(e.target.value))} />
              <span className="c-muted">× repeat</span>
            </div>
          )}
          {row.items.map((b) => (
            <BlockRow key={b.id} b={b} readOnly={readOnly} onChange={(patch) => update(b.id, patch)} onRemove={() => remove(b.id)} onUp={() => move(b.id, -1)} onDown={() => move(b.id, 1)} />
          ))}
        </div>
      ))}
      {!readOnly && (
        <div className="rl-row" style={{ gap: 4, paddingTop: 4 }}>
          <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => add("warmup")}>+ Warm up</button>
          <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => add("work")}>+ Work</button>
          <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={addRepeat}>+ Repeat</button>
          <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => add("cooldown")}>+ Cool down</button>
        </div>
      )}
    </div>
  );
}

function BlockRow({ b, onChange, onRemove, onUp, onDown, readOnly }: { b: Block; onChange: (p: Partial<Block>) => void; onRemove: () => void; onUp: () => void; onDown: () => void; readOnly: boolean }) {
  const amount = b.measure === "time" ? Math.round((b.durationS ?? 0) / 60) : Number(((b.distanceM ?? 0) / 1000).toFixed(2));
  return (
    <div className="rl-blockrow">
      <select className="rl-input" value={b.kind} disabled={readOnly} onChange={(e) => onChange({ kind: e.target.value as Block["kind"] })}>
        {(Object.keys(KIND_LABEL) as Block["kind"][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </select>
      <input className="rl-input" type="number" min={0} step={b.measure === "time" ? 1 : 0.1} value={amount} disabled={readOnly} onChange={(e) => { const v = Number(e.target.value); onChange(b.measure === "time" ? { durationS: Math.max(60, Math.round(v * 60)) } : { distanceM: Math.max(100, Math.round(v * 1000)) }); }} />
      <select className="rl-input" value={b.measure} disabled={readOnly} onChange={(e) => { const m = e.target.value as Block["measure"]; onChange(m === "time" ? { measure: m, durationS: b.durationS ?? 600, distanceM: null } : { measure: m, distanceM: b.distanceM ?? 1000, durationS: null }); }}>
        <option value="time">min</option>
        <option value="distance">km</option>
      </select>
      <select className="rl-input" value={b.targetEffort ?? "easy"} disabled={readOnly} onChange={(e) => onChange({ targetEffort: e.target.value as Block["targetEffort"] })}>
        {EFFORTS.map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}
      </select>
      {!readOnly && (
        <span className="rl-blockrow-tools">
          <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" aria-label="Move up" onClick={onUp} style={{ paddingInline: 6 }}>↑</button>
          <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" aria-label="Move down" onClick={onDown} style={{ paddingInline: 6 }}>↓</button>
          <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" aria-label="Remove block" onClick={onRemove} style={{ paddingInline: 6 }}>×</button>
        </span>
      )}
    </div>
  );
}
