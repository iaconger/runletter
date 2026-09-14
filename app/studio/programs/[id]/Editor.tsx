"use client";
// The editor for a Letter (ongoing, dated, sent week by week) or a Plan (fixed weeks, bought once).
// Three columns: settings, the calendar, and the side panel (this week's Letter, then the selected day).
// Everything autosaves. Pick a day, tap a shape, it is saved. Fine tuning is there when you want it.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BlockBar } from "@/components/run/BlockBar";
import { RecipeEditor, parseRecipe, recipeToBlocks } from "@/components/studio/Recipe";
import { watchPreview } from "@/lib/fit/encode";
import { WeekStrip, dayTitle, runKey } from "@/components/run/RunPieces";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_SPEC, prepareImage } from "@/lib/image";
import { clearDayAction, createPostAction, duplicateWeekAction, saveDayAction, saveIssueAction, setStatusAction, updateProgramAction } from "@/app/studio/actions";
import type { Post } from "@/lib/db/programs";
import { DAY_NAMES_LONG, RUN_TYPE_LABEL, addDays, dayDurationS, fmtMinutes, toISODate, type Block, type LetterIssue, type Program, type ProgramDay } from "@/lib/types";

const GOAL_LABEL: Record<Program["goal"], string> = { base: "Base building", "5k": "5K", "10k": "10K", half: "Half marathon", marathon: "Marathon", other: "Just running" };
const RUN_TYPES = Object.keys(RUN_TYPE_LABEL) as NonNullable<ProgramDay["runType"]>[];
const EFFORTS: NonNullable<Block["targetEffort"]>[] = ["easy", "moderate", "hard", "all_out"];
const KIND_LABEL: Record<Block["kind"], string> = { warmup: "Warm up", work: "Work", recovery: "Recover", cooldown: "Cool down" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const fmtDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

function newBlock(kind: Block["kind"], position: number, durationS = 600, effort: Block["targetEffort"] = "easy"): Block {
  return { id: uuid(), position, kind, measure: "time", durationS, distanceM: null, targetEffort: effort, targetPaceMin: null, targetPaceMax: null, repeatGroup: null, repeatCount: null };
}
function simpleRun(minutes: number, effort: Block["targetEffort"] = "easy"): Block[] {
  return [newBlock("work", 0, minutes * 60, effort)];
}
function repeatRun(warm: number, reps: number, workMin: number, restMin: number, cool: number): Block[] {
  const g = uuid();
  return [newBlock("warmup", 0, warm * 60), { ...newBlock("work", 1, workMin * 60, "hard"), repeatGroup: g, repeatCount: reps }, { ...newBlock("recovery", 2, restMin * 60, "easy"), repeatGroup: g, repeatCount: reps }, newBlock("cooldown", 3, cool * 60)];
}

/** One-tap shapes. A creator should never start from a blank day. */
type Shape = { key: string; label: string; sub: string; kind: ProgramDay["kind"]; runType: ProgramDay["runType"]; blocks: () => Block[] };
const SHAPES: Shape[] = [
  { key: "easy30", label: "Easy", sub: "30 min", kind: "run", runType: "easy", blocks: () => simpleRun(30) },
  { key: "easy45", label: "Easy", sub: "45 min", kind: "run", runType: "easy", blocks: () => simpleRun(45) },
  { key: "easy60", label: "Easy", sub: "60 min", kind: "run", runType: "easy", blocks: () => simpleRun(60) },
  { key: "long75", label: "Long", sub: "75 min", kind: "run", runType: "long", blocks: () => simpleRun(75) },
  { key: "long90", label: "Long", sub: "90 min", kind: "run", runType: "long", blocks: () => simpleRun(90) },
  { key: "long120", label: "Long", sub: "2 hours", kind: "run", runType: "long", blocks: () => simpleRun(120) },
  { key: "tempo", label: "Tempo", sub: "4 × 5 min", kind: "run", runType: "tempo", blocks: () => repeatRun(10, 4, 5, 2, 9) },
  { key: "tempo20", label: "Tempo", sub: "20 min steady", kind: "run", runType: "tempo", blocks: () => [newBlock("warmup", 0, 600), newBlock("work", 1, 1200, "moderate"), newBlock("cooldown", 2, 600)] },
  { key: "intervals", label: "Intervals", sub: "6 × 3 min", kind: "run", runType: "intervals", blocks: () => repeatRun(10, 6, 3, 1.5, 10) },
  { key: "hills", label: "Hills", sub: "8 × 1 min", kind: "run", runType: "intervals", blocks: () => repeatRun(12, 8, 1, 2, 10) },
  { key: "recovery", label: "Recovery", sub: "25 min", kind: "run", runType: "recovery", blocks: () => simpleRun(25) },
  { key: "race", label: "Race day", sub: "go", kind: "run", runType: "race", blocks: () => simpleRun(60, "all_out") },
  { key: "cross", label: "Cross", sub: "bike, swim, gym", kind: "cross", runType: null, blocks: () => [] },
  { key: "rest", label: "Rest", sub: "means rest", kind: "rest", runType: null, blocks: () => [] },
];

const SAVE_DELAY = 700;

export function Editor({
  program: initial,
  issues: initialIssues = [],
  posts: initialPosts = [],
  handle,
  userId,
  today,
  open,
  readOnly = false,
}: {
  program: Program;
  issues?: LetterIssue[];
  posts?: Post[];
  creatorName: string;
  handle?: string;
  userId?: string;
  today: string;
  open?: { week: number; day: number };
  readOnly?: boolean;
}) {
  const [program, setProgram] = useState<Program>(initial);
  const [issues, setIssues] = useState<LetterIssue[]>(initialIssues);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const letter = program.isLetter;
  const start = program.startRule === "fixed" ? program.fixedStartDate : null;

  // Open on today's week for a Letter, else on the first day that exists.
  const [sel, setSel] = useState<{ week: number; day: number }>(() => {
    if (open && open.week >= 1 && open.day >= 1 && open.day <= 7) return open;
    if (start) {
      const diff = Math.floor((addDays(today, 0).getTime() - addDays(start, 0).getTime()) / 86400000);
      if (diff >= 0 && diff < initial.weeks * 7) return { week: Math.floor(diff / 7) + 1, day: (diff % 7) + 1 };
    }
    const first = initial.days[0];
    return first ? { week: first.week, day: first.day } : { week: 1, day: 1 };
  });
  const [draft, setDraft] = useState<ProgramDay | null>(() => initial.days.find((d) => d.week === sel.week && d.day === sel.day) ?? null);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [fineTune, setFineTune] = useState(false);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const recipe = useMemo(() => (draft && draft.kind === "run" ? parseRecipe(draft.blocks) : null), [draft]);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start_] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<ProgramDay | null>(null);

  const weekStartOf = (wk: number) => (start ? toISODate(addDays(start, (wk - 1) * 7)) : null);
  const currentWeek = useMemo(() => {
    if (!start) return null;
    const diff = Math.floor((addDays(today, 0).getTime() - addDays(start, 0).getTime()) / 86400000);
    return diff >= 0 ? Math.floor(diff / 7) + 1 : null;
  }, [start, today]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  // ----- autosave for the selected day -----
  function commit(day: ProgramDay) {
    if (readOnly) return;
    setSaveState("saving");
    start_(async () => {
      const r = await saveDayAction(program.id, day);
      if (!r.ok) {
        setSaveState("error");
        return flash(r.error);
      }
      const saved = { ...day, id: r.id ?? day.id };
      setProgram((p) => ({ ...p, days: [...p.days.filter((d) => !(d.week === saved.week && d.day === saved.day)), saved].sort((a, b) => a.week - b.week || a.day - b.day) }));
      // Keep the draft's id in sync so posts can attach to it, without clobbering newer edits.
      setDraft((cur) => (cur && cur.week === saved.week && cur.day === saved.day ? { ...cur, id: saved.id } : cur));
      latest.current = latest.current && latest.current.week === saved.week && latest.current.day === saved.day ? { ...latest.current, id: saved.id } : latest.current;
      setSaveState("saved");
    });
  }
  function edit(next: ProgramDay, immediate = false) {
    setDraft(next);
    latest.current = next;
    if (readOnly) return;
    setSaveState("pending");
    if (timer.current) clearTimeout(timer.current);
    if (immediate) return commit(next);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (latest.current) commit(latest.current);
    }, SAVE_DELAY);
  }
  function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      if (latest.current) commit(latest.current);
    }
  }
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(week: number, day: number) {
    flush();
    setSel({ week, day });
    const d = program.days.find((x) => x.week === week && x.day === day) ?? null;
    setDraft(d);
    latest.current = d;
    setSaveState("idle");
    setFineTune(false);
    setShapesOpen(false);
    setTalkOpen(false);
  }

  function applyShape(s: Shape) {
    const base: ProgramDay = draft ?? { id: uuid(), week: sel.week, day: sel.day, kind: "run", runType: "easy", note: "", blocks: [] };
    edit({ ...base, kind: s.kind, runType: s.runType, blocks: s.blocks() }, true);
  }

  function removeDay() {
    if (!draft || readOnly) return;
    if (timer.current) clearTimeout(timer.current);
    start_(async () => {
      const r = await clearDayAction(program.id, draft.week, draft.day);
      if (!r.ok) return flash(r.error);
      setProgram((p) => ({ ...p, days: p.days.filter((d) => !(d.week === draft.week && d.day === draft.day)) }));
      setDraft(null);
      latest.current = null;
      setSaveState("idle");
    });
  }

  // ----- program settings -----
  function saveSetting(patch: Parameters<typeof updateProgramAction>[1] & Partial<Program>) {
    if (readOnly) return;
    setProgram((p) => ({ ...p, ...patch }));
    start_(async () => {
      const r = await updateProgramAction(program.id, patch);
      if (!r.ok) flash(r.error);
    });
  }

  const [uploading, setUploading] = useState(false);
  async function uploadCover(file: File) {
    if (!userId) return flash("Sign in to upload");
    setUploading(true);
    try {
      const supabase = createClient();
      const { blob, ext, type } = await prepareImage(file, IMAGE_SPEC.planCover);
      const path = `${userId}/${program.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("covers").upload(path, blob, { upsert: true, contentType: type });
      if (error) throw error;
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      saveSetting({ coverUrl: data.publicUrl });
    } catch (e) {
      flash(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function copyWeek(from: number, to: number) {
    if (readOnly) return;
    if (program.days.some((d) => d.week === to) && !confirm(`Replace week ${to} with a copy of week ${from}?`)) return;
    start_(async () => {
      const r = await duplicateWeekAction(program.id, from, to);
      if (!r.ok) return flash(r.error);
      const copied = program.days.filter((d) => d.week === from).map((d) => ({ ...d, id: uuid(), week: to }));
      setProgram((p) => ({ ...p, days: [...p.days.filter((d) => d.week !== to), ...copied].sort((a, b) => a.week - b.week || a.day - b.day) }));
      flash(`Week ${from} copied to week ${to}`);
    });
  }

  function setStatus(status: Program["status"]) {
    if (readOnly) return;
    start_(async () => {
      const r = await setStatusAction(program.id, status);
      if (!r.ok) return flash(r.error);
      setProgram((p) => ({ ...p, status }));
      flash(status === "published" ? (letter ? "Your Letter is open" : "Published") : "Unpublished");
    });
  }

  // ----- this week's Letter -----
  const issueFor = (wk: number) => issues.find((i) => i.week === wk);
  const issueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function saveIssue(wk: number, patch: { intro?: string; scheduledFor?: string | null; send?: boolean; unsend?: boolean }, delay = 0) {
    if (readOnly) return;
    const run = () =>
      start_(async () => {
        const r = await saveIssueAction({ programId: program.id, week: wk, ...patch });
        if (!r.ok || !r.issue) return flash(r.ok ? "Could not save" : r.error);
        const issue = r.issue;
        setIssues((list) => [...list.filter((i) => i.week !== wk), issue].sort((a, b) => a.week - b.week));
        if (patch.send) flash("Sent. Your runners have this week.");
        if (patch.scheduledFor) flash("Scheduled");
      });
    if (issueTimer.current) clearTimeout(issueTimer.current);
    if (delay) issueTimer.current = setTimeout(run, delay);
    else run();
  }

  // ----- posts on the selected day -----
  const [comment, setComment] = useState("");
  const dayPosts = draft ? posts.filter((p) => p.programDayId === draft.id) : [];
  function postComment() {
    if (!draft || !comment.trim()) return;
    flush();
    start_(async () => {
      const r = await createPostAction({ body: comment.trim(), programId: program.id, programDayId: draft.id });
      if (!r.ok || !r.post) return flash(r.ok ? "Could not post" : r.error);
      setPosts((list) => [r.post!, ...list]);
      setComment("");
      flash("Posted to your runners");
    });
  }

  // ----- warnings before publish -----
  const warnings = useMemo(() => {
    const w: string[] = [];
    const weeksWithDays = new Set(program.days.map((d) => d.week));
    if (!letter) for (let k = 1; k <= program.weeks; k++) if (!weeksWithDays.has(k)) w.push(`Week ${k} is empty`);
    const hardNoNote = program.days.filter((d) => d.kind === "run" && (d.runType === "tempo" || d.runType === "intervals" || d.runType === "race") && !d.note.trim());
    if (hardNoNote.length) w.push(`${hardNoNote.length} hard ${hardNoNote.length === 1 ? "day has" : "days have"} no note`);
    if (["half", "marathon"].includes(program.goal)) {
      const noLong = [...weeksWithDays].filter((k) => !program.days.some((d) => d.week === k && d.runType === "long"));
      if (noLong.length) w.push(`No long run in week${noLong.length > 1 ? "s" : ""} ${noLong.join(", ")}`);
    }
    return w;
  }, [program, letter]);

  const sentWeeks = issues.filter((i) => i.sentAt).map((i) => i.week);
  const streak = useMemo(() => {
    // consecutive sent weeks ending at the current (or last) week
    const end = currentWeek ?? program.weeks;
    let n = 0;
    for (let k = end; k >= 1; k--) {
      if (sentWeeks.includes(k)) n++;
      else if (k !== end) break;
      else if (!sentWeeks.includes(k)) continue;
    }
    return n;
  }, [sentWeeks, currentWeek, program.weeks]);

  const selIssue = issueFor(sel.week);
  const selWeekDays = program.days.filter((d) => d.week === sel.week);
  const weekStart = weekStartOf(sel.week);
  const filled = selWeekDays.length;

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1320px + 2 * var(--rl-gutter))", gap: "var(--rl-space-6)" }}>
      <div className="rl-between" style={{ flexWrap: "wrap", gap: "var(--rl-space-3)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">{readOnly ? "Example plan" : letter ? "Your Letter" : "Plan"}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{program.title}</h1>
          {letter && start && (
            <span className="rl-streak" aria-label={`${streak} weeks in a row`}>
              {Array.from({ length: Math.min(8, Math.max(program.weeks, 1)) }, (_, i) => <i key={i} data-on={sentWeeks.includes(i + 1) ? "true" : undefined} />)}
              {streak > 0 ? `${streak} week${streak === 1 ? "" : "s"} in a row` : `${sentWeeks.length} sent`}
            </span>
          )}
        </div>
        <div className="rl-row">
          <span className={`rl-chip ${program.status === "published" ? "rl-chip-success" : ""}`}>{program.status === "published" ? (letter ? "Open" : "Published") : program.status}</span>
          {program.status === "published" && handle && <Link href={`/c/${handle}/${program.id}`} className="rl-btn rl-btn-secondary rl-btn-sm">View public page</Link>}
          {program.status !== "published" ? (
            <button className="rl-btn rl-btn-primary" type="button" disabled={readOnly || pending} onClick={() => setStatus("published")}>
              {letter ? "Open" : "Publish"}
            </button>
          ) : (
            <button className="rl-btn rl-btn-ghost" type="button" disabled={readOnly || pending} onClick={() => setStatus("draft")}>{letter ? "Close" : "Unpublish"}</button>
          )}
        </div>
      </div>

      {warnings.length > 0 && !readOnly && (
        <div className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "var(--rl-space-3) var(--rl-space-4)", display: "flex", gap: "var(--rl-space-4)", flexWrap: "wrap" }}>
          <span className="t-label c-muted" style={{ alignSelf: "center" }}>Optional</span>
          {warnings.map((w) => <span key={w} className="rl-chip">{w}</span>)}
        </div>
      )}

      <div className="rl-editor">
        {/* ---------- settings ---------- */}
        <section className="rl-card" aria-label="Settings">
          <span className="t-label c-muted">{letter ? "Your Letter" : "This plan"}</span>
          <div className="rl-field">
            <label>Cover</label>
            <div style={{ aspectRatio: "4 / 3", borderRadius: "var(--rl-radius-md)", overflow: "hidden", background: "var(--rl-surface-sunken)", border: "var(--rl-border-hairline) solid var(--rl-hairline)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {program.coverUrl && <img src={program.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
            {!readOnly && (
              <div className="rl-row" style={{ gap: 6 }}>
                <label className="rl-btn rl-btn-secondary rl-btn-sm" style={{ cursor: "pointer" }}>
                  {uploading ? "Uploading…" : program.coverUrl ? "Replace" : "Choose photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                </label>
                {program.coverUrl && !uploading && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => saveSetting({ coverUrl: null })}>Remove</button>}
              </div>
            )}

          </div>
          <div className="rl-field"><label>Title</label><input className="rl-input" value={program.title} readOnly={readOnly} maxLength={80} onChange={(e) => setProgram({ ...program, title: e.target.value })} onBlur={(e) => e.target.value.trim() && e.target.value !== initial.title && saveSetting({ title: e.target.value.trim() })} /></div>
          <div className="rl-field"><label>Description</label><textarea className="rl-input" value={program.description} readOnly={readOnly} placeholder={letter ? "What subscribers get" : "Who it's for"} onChange={(e) => setProgram({ ...program, description: e.target.value })} onBlur={(e) => saveSetting({ description: e.target.value })} /></div>
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
          {letter ? (
            <>
              <div className="rl-field"><label>Started</label>
                <input className="rl-input" type="date" value={program.fixedStartDate ?? ""} disabled={readOnly} onChange={(e) => e.target.value && saveSetting({ startRule: "fixed", fixedStartDate: e.target.value })} />
              </div>
              <div className="rl-field"><label>Price a month</label>
                <div className="rl-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <span className="c-muted">$</span>
                  <input className="rl-input" type="number" min={0} max={100} step={1} value={Math.round((program.priceCents ?? 0) / 100)} disabled={readOnly} onChange={(e) => setProgram({ ...program, priceCents: Math.round(Number(e.target.value) * 100) })} onBlur={(e) => saveSetting({ priceCents: Math.max(0, Math.round(Number(e.target.value) * 100)) })} />
                </div>
                <span className="rl-help">0 = free</span>
              </div>
            </>
          ) : (
            <>
              <div className="rl-field"><label>Weeks</label><input className="rl-input" type="number" min={1} max={52} value={program.weeks} readOnly={readOnly} onChange={(e) => setProgram({ ...program, weeks: Number(e.target.value) || 1 })} onBlur={(e) => saveSetting({ weeks: Math.min(52, Math.max(1, Number(e.target.value) || 1)) })} /></div>
              <div className="rl-field"><label>Price</label>
                <div className="rl-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <span className="c-muted">$</span>
                  <input className="rl-input" type="number" min={0} step={1} value={Math.round((program.priceCents ?? 0) / 100)} disabled={readOnly} onChange={(e) => setProgram({ ...program, priceCents: Math.round(Number(e.target.value) * 100) })} onBlur={(e) => saveSetting({ access: "one_time", priceCents: Math.round(Number(e.target.value) * 100) })} />
                </div>

                <label className="rl-row" style={{ gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={program.access === "creator_sub"} disabled={readOnly} onChange={(e) => saveSetting({ access: e.target.checked ? "creator_sub" : "one_time" })} />
                  <span className="t-body-sm">Included for Letter subscribers</span>
                </label>
              </div>
            </>
          )}
        </section>

        {/* ---------- calendar ---------- */}
        <section className="rl-stack" aria-label="Weeks" style={{ gap: "var(--rl-space-5)" }}>
          {Array.from({ length: program.weeks }, (_, i) => i + 1).map((wk) => {
            const days = program.days.filter((x) => x.week === wk);
            const ws = weekStartOf(wk);
            const runs = days.filter((d) => d.kind === "run").length;
            const mins = Math.round(days.reduce((a, d) => a + dayDurationS(d), 0) / 60);
            const iss = issueFor(wk);
            const state = iss?.sentAt ? "sent" : iss?.scheduledFor ? "scheduled" : "draft";
            const prevHasDays = wk > 1 && program.days.some((x) => x.week === wk - 1);
            return (
              <div key={wk} className="rl-weekrow" data-current={currentWeek === wk ? "true" : undefined}>
                <button type="button" className="w" onClick={() => pick(wk, sel.week === wk ? sel.day : 1)} style={{ background: "none", border: 0, textAlign: "left", cursor: "pointer", padding: 0, paddingTop: 8 }} aria-label={`Select week ${wk}`}>
                  <b>{ws ? fmtDate(addDays(ws, 0)) : `Week ${wk}`}</b>
                  <span>{ws ? `Week ${wk}` : ""}</span>
                  <span className="tot">{days.length ? `${runs} run${runs === 1 ? "" : "s"} · ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ""}` : `${mins} min`}` : "empty"}</span>
                  {letter && <span className="rl-stamp" data-state={state} style={{ marginTop: 4 }}>{state}</span>}
                </button>
                <div className="rl-stack" style={{ gap: 6 }}>
                  <WeekStrip days={days} selectedDay={wk === sel.week ? sel.day : undefined} onPick={(d) => pick(wk, d)} weekStart={ws} today={today} />
                  {!readOnly && (
                    <div className="rl-row" style={{ gap: 4 }}>
                      {prevHasDays && days.length === 0 && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={pending} onClick={() => copyWeek(wk - 1, wk)}>Same as last week</button>}
                      {days.length > 0 && wk < program.weeks && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={pending} onClick={() => copyWeek(wk, wk + 1)}>Copy to next week</button>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {letter && !readOnly && (
            <button type="button" className="rl-btn rl-btn-secondary" style={{ alignSelf: "flex-start" }} disabled={pending || program.weeks >= 520} onClick={() => saveSetting({ weeks: program.weeks + 1 })}>
              + Add week {program.weeks + 1}{weekStartOf(program.weeks + 1) ? ` (${fmtDate(addDays(weekStartOf(program.weeks + 1)!, 0))})` : ""}
            </button>
          )}
        </section>

        {/* ---------- side panel ---------- */}
        <div className="rl-stack" style={{ gap: "var(--rl-space-4)" }}>
          {letter && (
            <section className="rl-issue" aria-label="This week's Letter">
              <div className="rl-row" style={{ alignItems: "center", gap: "var(--rl-space-3)" }}>
                <div className="rl-ring" style={{ ["--p" as string]: Math.round((filled / 7) * 100) }} aria-hidden="true"><span>{filled}/7</span></div>
                <div className="rl-stack" style={{ gap: 0 }}>
                  <span className="t-label c-muted">Week {sel.week}{weekStart ? ` · ${fmtDate(addDays(weekStart, 0))} to ${fmtDate(addDays(weekStart, 6))}` : ""}</span>
                  <span className="t-heading">{selIssue?.sentAt ? "Sent to your runners" : selIssue?.scheduledFor ? `Goes out ${new Date(selIssue.scheduledFor).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}` : filled < 7 ? `${7 - filled} day${7 - filled === 1 ? "" : "s"} to fill` : "Ready to send"}</span>
                </div>
              </div>
              <div className="rl-field">
                <label>This week</label>
                <textarea
                  className="rl-input"
                  rows={4}
                  readOnly={readOnly || !!selIssue?.sentAt}
                  placeholder="A few lines about the week"
                  defaultValue={selIssue?.intro ?? ""}
                  key={`intro-${sel.week}`}
                  onChange={(e) => saveIssue(sel.week, { intro: e.target.value }, 800)}
                />

              </div>
              {!readOnly && (
                <div className="rl-row">
                  {selIssue?.sentAt ? (
                    <>
                      <span className="rl-stamp" data-state="sent">Sent {fmtDate(new Date(selIssue.sentAt))}</span>
                      <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={pending} onClick={() => confirm("Take this week back? Runners lose it until you send again.") && saveIssue(sel.week, { unsend: true })}>Unsend</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="rl-btn rl-btn-primary" disabled={pending || filled === 0} onClick={() => confirm(`Send week ${sel.week} to your runners now?`) && saveIssue(sel.week, { send: true })}>Send now</button>
                      {weekStart && (
                        <button type="button" className="rl-btn rl-btn-secondary" disabled={pending || filled === 0} onClick={() => { const d = addDays(weekStart, -1); d.setHours(18, 0, 0, 0); if (d.getTime() < Date.now()) return saveIssue(sel.week, { send: true }); saveIssue(sel.week, { scheduledFor: d.toISOString() }); }}>
                          {selIssue?.scheduledFor ? "Reschedule" : "Sunday 6pm"}
                        </button>
                      )}
                      {selIssue?.scheduledFor && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => saveIssue(sel.week, { scheduledFor: null })}>Cancel</button>}
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="rl-card" aria-label="Selected day" style={{ gap: "var(--rl-space-3)" }}>
            <div className="rl-daypanel-head" data-run={runKey(draft ?? undefined)}>
              <div className="rl-stack" style={{ gap: 0 }}>
                <span className="t-label" style={{ opacity: 0.8 }}>{DAY_NAMES_LONG[sel.day - 1]}{weekStart ? ` ${fmtDate(addDays(weekStart, sel.day - 1))}` : ` · week ${sel.week}`}</span>
                <span className="t-title">{draft ? dayTitle(draft) : "Nothing yet"}</span>
              </div>
              {draft && draft.kind === "run" && <span className="t-numeral-lg">{fmtMinutes(dayDurationS(draft))}</span>}
            </div>

            {/* 1. Shape. One tap fills the day; after that it folds away behind "Change". */}
            {(!draft || shapesOpen) && (
              <div className="rl-stack" style={{ gap: 6 }}>
                {draft && <span className="t-label c-muted">Change to</span>}
                <div className="rl-shapes">
                  {SHAPES.map((s) => (
                    <button key={s.key} type="button" className="rl-shape" data-run={s.kind === "cross" ? "cross" : s.runType ?? undefined} disabled={readOnly} onClick={() => { applyShape(s); setShapesOpen(false); }}>
                      <b>{s.label}</b>
                      <small>{s.sub}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draft && (
              <>
                <div className="rl-between" style={{ alignItems: "center" }}>
                  <div className="rl-row" style={{ gap: 6 }} role="radiogroup" aria-label="Run type">
                    {draft.kind === "run" && RUN_TYPES.map((t) => (
                      <button key={t} type="button" className="rl-chip rl-run-chip" data-run={t} aria-pressed={draft.runType === t} disabled={readOnly} onClick={() => edit({ ...draft, runType: t })} style={{ cursor: "pointer" }}>{RUN_TYPE_LABEL[t]}</button>
                    ))}
                  </div>
                  <div className="rl-row" style={{ gap: 4, flexWrap: "nowrap" }}>
                    {!readOnly && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => setShapesOpen((v) => !v)} aria-expanded={shapesOpen}>{shapesOpen ? "Keep" : "Change"}</button>}
                    {!readOnly && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={removeDay} disabled={pending}>Clear</button>}
                  </div>
                </div>

                {/* 2. The numbers. A recipe when the run has one; pieces for anything else. */}
                {draft.kind === "run" && (
                  recipe && !fineTune ? (
                    <RecipeEditor recipe={recipe} readOnly={readOnly} onChange={(r) => edit({ ...draft, blocks: recipeToBlocks(r, draft.blocks) })} />
                  ) : (
                    <>
                      <BlockBar blocks={draft.blocks} legend={false} />
                      <BlocksEditor blocks={draft.blocks} readOnly={readOnly} onChange={(blocks) => edit({ ...draft, blocks })} />
                    </>
                  )
                )}

                {/* 3. The note. The part nobody else can write. */}
                <div className="rl-field">
                  <label>Your note</label>
                  <textarea className="rl-input" value={draft.note} readOnly={readOnly} maxLength={400} rows={3} onChange={(e) => edit({ ...draft, note: e.target.value })} placeholder={draft.kind === "run" ? "Why this run. What to feel, what to ignore." : "Optional"} />
                </div>

                {draft.kind === "run" && (
                  <div className="rl-row" style={{ gap: 6 }}>
                    {recipe && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => setFineTune((v) => !v)} aria-expanded={fineTune}>{fineTune ? "Back to the recipe" : "Pieces"}</button>}
                    <WatchPreview day={draft} programId={program.id} />
                  </div>
                )}
                <span className="rl-help">{readOnly ? "Example" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save" : saveState === "saved" ? "Saved" : ""}</span>

                {!readOnly && (
                  <div className="rl-field" style={{ borderTop: "var(--rl-border-hairline) solid var(--rl-hairline)", paddingTop: "var(--rl-space-3)" }}>
                    {!talkOpen && dayPosts.length === 0 ? (
                      <button type="button" className="rl-linkbtn" style={{ alignSelf: "flex-start", font: "var(--rl-text-body-sm)" }} onClick={() => setTalkOpen(true)}>Say something to your runners about this run</button>
                    ) : (
                      <>
                        <label>To your runners</label>
                        <textarea className="rl-input" rows={2} value={comment} maxLength={2000} placeholder="Reps felt long today? Cut to 5. Or: who's in for the Sunday long run at the lake?" onChange={(e) => setComment(e.target.value)} />
                        <button type="button" className="rl-btn rl-btn-secondary rl-btn-sm" style={{ alignSelf: "flex-start" }} disabled={pending || !comment.trim() || saveState === "pending" || saveState === "saving"} onClick={postComment}>Post</button>
                      </>
                    )}
                    {dayPosts.length > 0 && (
                      <ul className="rl-stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 6 }}>
                        {dayPosts.map((p) => (
                          <li key={p.id} className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "8px 10px" }}>
                            <span className="t-body-sm">{p.body}</span>
                            <span className="rl-help" style={{ display: "block" }}>{fmtDate(new Date(p.createdAt))}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {toast && <div className="rl-toast" role="status" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}>{toast}</div>}
    </main>
  );
}

// ---------- blocks (fine tune) ----------

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

  const rows: { group: string | null; items: Block[] }[] = [];
  for (const b of sorted) {
    const last = rows[rows.length - 1];
    if (b.repeatGroup && last && last.group === b.repeatGroup) last.items.push(b);
    else rows.push({ group: b.repeatGroup, items: [b] });
  }

  return (
    <div className="rl-stack" style={{ gap: 6 }}>
      {rows.map((row) => {
        const items = row.items.map((b, i) => (
          <BlockRow key={b.id} b={b} readOnly={readOnly} first={sorted[0]!.id === b.id} last={sorted[sorted.length - 1]!.id === b.id} onChange={(patch) => update(b.id, patch)} onRemove={() => remove(b.id)} onUp={() => move(b.id, -1)} onDown={() => move(b.id, 1)} hint={row.group ? (i === 0 ? "on" : "off") : undefined} />
        ));
        if (!row.group) return items;
        return (
          <div key={row.group} className="rl-repeat">
            <div className="head">
              <div className="rl-stepper" style={{ height: 26 }}>
                <button type="button" aria-label="Fewer repeats" disabled={readOnly} onClick={() => setRepeatCount(row.group!, (row.items[0]!.repeatCount ?? 2) - 1)}>−</button>
                <input type="number" min={2} max={30} value={row.items[0]!.repeatCount ?? 2} disabled={readOnly} onChange={(e) => setRepeatCount(row.group!, Number(e.target.value))} aria-label="Repeats" />
                <button type="button" aria-label="More repeats" disabled={readOnly} onClick={() => setRepeatCount(row.group!, (row.items[0]!.repeatCount ?? 2) + 1)}>+</button>
              </div>
              <span><b>×</b> repeat</span>
            </div>
            {items}
          </div>
        );
      })}
      {!readOnly && (
        <div className="rl-addrow" style={{ paddingTop: 4 }}>
          <button type="button" onClick={() => add("warmup")}>+ Warm up</button>
          <button type="button" onClick={() => add("work")}>+ Work</button>
          <button type="button" onClick={addRepeat}>+ Repeat</button>
          <button type="button" onClick={() => add("cooldown")}>+ Cool down</button>
        </div>
      )}
    </div>
  );
}

function BlockRow({ b, onChange, onRemove, onUp, onDown, readOnly, first, last, hint }: { b: Block; onChange: (p: Partial<Block>) => void; onRemove: () => void; onUp: () => void; onDown: () => void; readOnly: boolean; first: boolean; last: boolean; hint?: string }) {
  const isTime = b.measure === "time";
  const amount = isTime ? Math.round((b.durationS ?? 0) / 60) : Number(((b.distanceM ?? 0) / 1000).toFixed(1));
  const step = isTime ? 1 : 0.5;
  const setAmount = (v: number) => onChange(isTime ? { durationS: Math.max(60, Math.round(v * 60)) } : { distanceM: Math.max(100, Math.round(v * 1000)) });
  const toggleUnit = () => onChange(isTime ? { measure: "distance", distanceM: b.distanceM ?? 1000, durationS: null } : { measure: "time", durationS: b.durationS ?? 600, distanceM: null });
  return (
    <div className="rl-piece" data-effort={b.targetEffort ?? "easy"}>
      <span className="bar" aria-hidden="true" />
      <div className="body">
        <div className="top">
          <select className="rl-piece-kind" value={b.kind} disabled={readOnly} onChange={(e) => onChange({ kind: e.target.value as Block["kind"] })} aria-label="Kind">
            {(Object.keys(KIND_LABEL) as Block["kind"][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}{hint && k === b.kind ? "" : ""}</option>)}
          </select>
          <div className="rl-stepper">
            <button type="button" aria-label="Less" disabled={readOnly} onClick={() => setAmount(amount - (isTime ? 1 : step))}>−</button>
            <input type="number" min={0} step={step} value={amount} disabled={readOnly} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Amount" />
            <button type="button" aria-label="More" disabled={readOnly} onClick={() => setAmount(amount + (isTime ? 1 : step))}>+</button>
            <button type="button" className="unit" disabled={readOnly} onClick={toggleUnit} title="Switch between minutes and kilometres">{isTime ? "min" : "km"}</button>
          </div>
        </div>
        <div className="bottom">
          <div className="rl-seg" role="radiogroup" aria-label="Effort">
            {EFFORTS.map((x) => (
              <button key={x} type="button" role="radio" aria-checked={(b.targetEffort ?? "easy") === x} aria-pressed={(b.targetEffort ?? "easy") === x} disabled={readOnly} onClick={() => onChange({ targetEffort: x })}>{x === "all_out" ? "All out" : x[0]!.toUpperCase() + x.slice(1)}</button>
            ))}
          </div>
          {!readOnly && (
            <span className="rl-piece-tools">
              <button type="button" aria-label="Move up" onClick={onUp} disabled={first}>↑</button>
              <button type="button" aria-label="Move down" onClick={onDown} disabled={last}>↓</button>
              <button type="button" aria-label="Remove" onClick={onRemove}>×</button>
            </span>
          )}
        </div>
        {(b.kind === "work" || b.kind === "recovery") && (
          <PaceRow b={b} readOnly={readOnly} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

/** Optional pace range. Left blank, the watch uses the effort as a heart-rate zone, which is personal to each runner. */
function PaceRow({ b, onChange, readOnly }: { b: Block; onChange: (p: Partial<Block>) => void; readOnly: boolean }) {
  const has = b.targetPaceMin != null && b.targetPaceMax != null;
  const [open, setOpen] = useState(has);
  const fmt = (s: number | null | undefined) => (s == null ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  const parse = (v: string): number | null => {
    const m = v.trim().match(/^(\d{1,2})[:.](\d{1,2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  if (!open) {
    return readOnly ? null : (
      <button type="button" className="rl-linkbtn" style={{ alignSelf: "flex-start", font: "var(--rl-text-label)", color: "var(--rl-text-muted)", textDecoration: "none" }} onClick={() => setOpen(true)}>
        + pace
      </button>
    );
  }
  return (
    <div className="rl-row" style={{ gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
      <span className="rl-help" style={{ whiteSpace: "nowrap" }}>Pace</span>
      <input className="rl-input" placeholder="4:30" defaultValue={fmt(b.targetPaceMin)} disabled={readOnly} style={{ width: 62, height: 30, padding: "0 8px", textAlign: "center" }} onBlur={(e) => { const v = parse(e.target.value); onChange({ targetPaceMin: v, targetPaceMax: v != null ? (b.targetPaceMax ?? v + 15) : null }); }} aria-label="Fastest pace per km" />
      <span className="rl-help">to</span>
      <input className="rl-input" placeholder="4:45" defaultValue={fmt(b.targetPaceMax)} disabled={readOnly} style={{ width: 62, height: 30, padding: "0 8px", textAlign: "center" }} onBlur={(e) => { const v = parse(e.target.value); onChange({ targetPaceMax: v, targetPaceMin: v != null ? (b.targetPaceMin ?? Math.max(60, v - 15)) : null }); }} aria-label="Slowest pace per km" />
      <span className="rl-help" style={{ whiteSpace: "nowrap" }}>/km</span>
      {!readOnly && <button type="button" className="rl-piece-tools" style={{ opacity: 1 }} aria-label="Remove pace target" onClick={() => { onChange({ targetPaceMin: null, targetPaceMax: null }); setOpen(false); }}><span style={{ fontSize: 14 }}>×</span></button>}
    </div>
  );
}

/** What the watch will show for this day, step by step, plus the .FIT the runner would get. */
function WatchPreview({ day, programId }: { day: ProgramDay; programId: string }) {
  const [open, setOpen] = useState(false);
  const steps = watchPreview(day);
  const hasZones = steps.some((s) => s.target.startsWith("HR"));
  return (
    <>
      <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide watch" : "Watch"}
      </button>
      {open && (
        <div className="rl-watch" style={{ flexBasis: "100%" }}>
          <ol>
            {steps.map((st, i) => (
              <li key={i} data-kind={st.kind}>
                <span className="nm">{st.name}</span>
                <span className="am">{st.amount}</span>
                <span className="tg">{st.target}</span>
              </li>
            ))}
          </ol>
          {hasZones && <span className="rl-help">Effort becomes a heart-rate zone on the runner&rsquo;s own watch.</span>}
          {day.blocks.length > 0 && (
            <a className="rl-btn rl-btn-secondary rl-btn-sm" style={{ alignSelf: "flex-start" }} href={`/api/fit?program=${programId}&week=${day.week}&day=${day.day}`} download>
              .FIT
            </a>
          )}
        </div>
      )}
    </>
  );
}
