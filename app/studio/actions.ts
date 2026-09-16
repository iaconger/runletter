"use server";
// Server actions for the studio. Thin: validate with zod, call lib/db, revalidate.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Goal, Level, ProgramDay, Program, StartRule, Access, mondayOf } from "@/lib/types";
import * as db from "@/lib/db/programs";
import { enqueueWeek } from "@/lib/db/sync";
import { track } from "@/lib/analytics";
import { getUser } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";
  return { ok: false, error: msg };
}

export async function createProgramAction(formData: FormData) {
  const parsed = z
    .object({ title: z.string().trim().min(1).max(80), weeks: z.coerce.number().int().min(1).max(52), goal: Goal, level: Level, priceCents: z.coerce.number().int().min(0).optional() })
    .safeParse({ title: formData.get("title"), weeks: formData.get("weeks"), goal: formData.get("goal"), level: formData.get("level"), priceCents: formData.get("price") ? Math.round(Number(formData.get("price")) * 100) : undefined });
  if (!parsed.success) redirect("/studio/new?error=" + encodeURIComponent("Check the title, weeks, goal and level."));
  const id = await db.createProgram({ ...parsed.data, isLetter: false });
  revalidatePath("/studio");
  redirect(`/studio/programs/${id}`);
}

/** Start the creator's Letter: dated from this week's Monday, four weeks open to begin with, grows as they write. */
export async function startLetterAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 80) || "My Letter";
  const goal = Goal.safeParse(formData.get("goal"));
  const level = Level.safeParse(formData.get("level"));
  const existing = await db.getMyLetter();
  if (existing) redirect(`/studio/programs/${existing.id}`);
  const start = mondayOf(new Date());
  const id = await db.createProgram({ title, weeks: 4, goal: goal.success ? goal.data : "base", level: level.success ? level.data : "intermediate", isLetter: true, fixedStartDate: start });
  // The creator runs their own Letter: enrol them so completions and pushes work for them too.
  await db.enrolSelf(id, start);
  revalidatePath("/studio");
  redirect(`/studio/programs/${id}`);
}

export async function createPostAction(input: { body: string; programId?: string | null; programDayId?: string | null }): Promise<ActionResult & { post?: db.Post }> {
  const parsed = z.object({ body: z.string().trim().min(1, "Write something first").max(2000), programId: z.string().uuid().nullable().optional(), programDayId: z.string().uuid().nullable().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  try {
    const post = await db.createPost(parsed.data);
    revalidatePath("/studio");
    return { ok: true, post };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  try {
    await db.deletePost(id);
    revalidatePath("/studio");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const ProgramPatch = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(2000).optional(),
  goal: Goal.optional(),
  level: Level.optional(),
  weeks: z.number().int().min(1).max(52).optional(),
  startRule: StartRule.optional(),
  fixedStartDate: z.string().date().nullable().optional(),
  access: Access.optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
});

export async function updateProgramAction(id: string, patch: unknown): Promise<ActionResult> {
  const parsed = ProgramPatch.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  try {
    await db.updateProgram(id, parsed.data);
    revalidatePath(`/studio/programs/${id}`);
    revalidatePath("/studio");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveDayAction(programId: string, day: unknown): Promise<ActionResult & { id?: string }> {
  const parsed = ProgramDay.omit({ id: true }).extend({ id: z.string().optional() }).safeParse(day);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid day" };
  try {
    const id = await db.saveDay(programId, parsed.data);
    revalidatePath(`/studio/programs/${programId}`);
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function clearDayAction(programId: string, week: number, day: number): Promise<ActionResult> {
  try {
    await db.clearDay(programId, week, day);
    revalidatePath(`/studio/programs/${programId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function duplicateWeekAction(programId: string, from: number, to: number): Promise<ActionResult> {
  try {
    await db.duplicateWeek(programId, from, to);
    revalidatePath(`/studio/programs/${programId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setStatusAction(programId: string, status: Program["status"]): Promise<ActionResult> {
  try {
    await db.setProgramStatus(programId, status);
    if (status === "published") {
      const user = await getUser();
      if (user) track("program_published", { program_id: programId }, user.id);
    }
    revalidatePath(`/studio/programs/${programId}`);
    revalidatePath("/studio");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProfileAction(formData: FormData) {
  const parsed = z
    .object({
      handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Handle: 3 to 24 letters, numbers or underscores"),
      displayName: z.string().trim().min(1).max(60),
      bio: z.string().max(500),
      instagram: z.string().url().optional().or(z.literal("")),
      strava: z.string().url().optional().or(z.literal("")),
      youtube: z.string().url().optional().or(z.literal("")),
      tiktok: z.string().url().optional().or(z.literal("")),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/studio/page?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the form"));
  const { handle, displayName, bio, ...linkFields } = parsed.data;
  const links: Record<string, string> = {};
  for (const [k, v] of Object.entries(linkFields)) if (v) links[k] = v;
  try {
    await db.updateMyProfile({ handle, displayName, bio, links });
  } catch (e) {
    const msg = e instanceof Error && /duplicate|unique/i.test(e.message) ? "That handle is taken." : "Could not save. Try again.";
    redirect("/studio/page?error=" + encodeURIComponent(msg));
  }
  revalidatePath("/studio/page");
  revalidatePath(`/c/${handle}`);
  redirect("/studio/page?saved=1");
}

/** Save the week's intro, or send / schedule the issue. Sending means runners can see the week in their app. */
export async function saveIssueAction(input: { programId: string; week: number; intro?: string; scheduledFor?: string | null; send?: boolean; unsend?: boolean }): Promise<ActionResult & { issue?: import("@/lib/types").LetterIssue }> {
  const parsed = z
    .object({ programId: z.string().uuid(), week: z.number().int().min(1).max(520), intro: z.string().max(4000).optional(), scheduledFor: z.string().datetime({ offset: true }).nullable().optional(), send: z.boolean().optional(), unsend: z.boolean().optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { programId, week, intro, scheduledFor, send, unsend } = parsed.data;
  try {
    const issue = await db.upsertIssue({
      programId,
      week,
      intro,
      scheduledFor: send ? null : scheduledFor,
      sentAt: send ? new Date().toISOString() : unsend ? null : undefined,
    });
    revalidatePath(`/studio/programs/${programId}`);
    // Sending a week puts its runs on every connected watch, the creator's included.
    if (send) {
      const user = await getUser();
      if (user) track("letter_week_sent", { program_id: programId, week }, user.id);
      try {
        await enqueueWeek(programId, week);
      } catch (e) {
        console.error("enqueueWeek", e);
      }
    }
    return { ok: true, issue };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Share a run you did (from Strava) into your week: it becomes that day in your Letter, with your note.
 * Steady run of the same length at the effort the pace suggests; the creator can reshape it in the editor.
 */
export async function shareRunAction(formData: FormData): Promise<void> {
  const extraId = String(formData.get("extraId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 400);
  const letter = await db.getMyLetter();
  if (!letter || !letter.fixedStartDate) redirect("/studio");
  const x = await db.getMyExtra(extraId);
  if (!x) redirect("/studio?shared=0");
  const diff = Math.floor((new Date(`${x.date}T00:00:00`).getTime() - new Date(`${letter.fixedStartDate}T00:00:00`).getTime()) / 86400000);
  if (diff < 0) redirect("/studio?shared=0");
  const week = Math.floor(diff / 7) + 1;
  const day = (diff % 7) + 1;
  if (week > letter.weeks) await db.updateProgram(letter.id, { weeks: week });
  const mins = Math.max(5, Math.round((x.durationS ?? 1800) / 60));
  const pace = x.avgPaceS ?? 360;
  // Long if over 75 minutes, tempo if quick, otherwise easy. The creator can change it.
  const runType = mins >= 75 ? "long" : pace < 300 ? "tempo" : "easy";
  const effort = runType === "tempo" ? "moderate" : "easy";
  const blocks = [{ id: crypto.randomUUID(), position: 0, kind: "work" as const, measure: "time" as const, durationS: mins * 60, distanceM: null, targetEffort: effort as "easy" | "moderate", targetPaceMin: null, targetPaceMax: null, repeatGroup: null, repeatCount: null }];
  await db.saveDay(letter.id, { week, day, kind: "run", runType, note: note || (x.name ?? ""), blocks });
  revalidatePath("/studio");
  revalidatePath(`/studio/programs/${letter.id}`);
  redirect(`/studio/programs/${letter.id}?week=${week}&day=${day}`);
}

// ---------- the week builder: one tap per day ----------

/** Put a shape on a day. Replaces whatever was there. */
export async function setShapeAction(programId: string, week: number, day: number, shapeKey: string): Promise<ActionResult> {
  const { shapeByKey } = await import("@/lib/shapes");
  const s = shapeByKey(shapeKey);
  if (!s) return { ok: false, error: "Unknown shape" };
  try {
    await growToWeek(programId, week);
    await db.saveDay(programId, { week, day, kind: s.kind, runType: s.runType, note: "", blocks: s.blocks() });
    revalidatePath("/studio", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** Longer or shorter, keeping the shape: every timed piece moves by the same proportion. */
export async function stretchDayAction(programId: string, week: number, day: number, deltaMin: number): Promise<ActionResult> {
  const { scaleBlocks } = await import("@/lib/shapes");
  try {
    const program = await db.getProgram(programId);
    const d = program?.days.find((x) => x.week === week && x.day === day);
    if (!d || d.kind !== "run") return { ok: false, error: "Nothing to stretch" };
    const total = d.blocks.reduce((a, b) => a + (b.durationS ?? 0) * (b.repeatCount ?? 1), 0);
    if (!total) return { ok: false, error: "Nothing to stretch" };
    const next = Math.max(600, total + deltaMin * 60);
    await db.saveDay(programId, { ...d, blocks: scaleBlocks(d.blocks, next / total) });
    revalidatePath("/studio", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** The creator's line about that day. */
export async function noteDayAction(programId: string, week: number, day: number, note: string): Promise<ActionResult> {
  try {
    const program = await db.getProgram(programId);
    const d = program?.days.find((x) => x.week === week && x.day === day);
    if (!d) return { ok: false, error: "Nothing there yet" };
    await db.saveDay(programId, { ...d, note: note.slice(0, 400) });
    revalidatePath("/studio", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** A run you actually did, dropped onto a day of the week you are writing. */
export async function useMyRunAction(programId: string, week: number, day: number, extraId: string): Promise<ActionResult> {
  const { shapeFromRun } = await import("@/lib/shapes");
  try {
    const x = await db.getMyExtra(extraId);
    if (!x) return { ok: false, error: "That run is gone" };
    await growToWeek(programId, week);
    const s = shapeFromRun(x.durationS, x.avgPaceS);
    await db.saveDay(programId, { week, day, kind: s.kind, runType: s.runType, note: x.name ?? "", blocks: s.blocks });
    revalidatePath("/studio", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** Last week again, as a starting point. */
export async function repeatWeekAction(programId: string, week: number): Promise<ActionResult> {
  if (week < 2) return { ok: false, error: "No week before this one" };
  try {
    await db.duplicateWeek(programId, week - 1, week);
    revalidatePath("/studio", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** A week keeps going as long as the creator keeps writing it: stretch the program to reach the week being written. */
async function growToWeek(programId: string, week: number) {
  const p = await db.getProgram(programId);
  if (p && week > p.weeks) await db.updateProgram(programId, { weeks: week });
}

/** Save a day from the three answers (kind, how much, how fast) the studio asks for. */
export async function saveDaySpecAction(programId: string, week: number, day: number, spec: unknown): Promise<ActionResult> {
  const { buildBlocks } = await import("@/lib/shapes");
  const Spec = z.object({
    type: z.enum(["easy", "long", "tempo", "intervals", "recovery", "race", "cross", "rest"]),
    measure: z.enum(["distance", "time"]),
    amount: z.number().min(0).max(200000),
    paceS: z.number().int().min(120).max(1200).nullable(),
    effort: z.enum(["easy", "moderate", "hard", "all_out"]).nullable(),
    reps: z.number().int().min(1).max(40).optional(),
    recoveryS: z.number().int().min(0).max(1800).optional(),
    warmS: z.number().int().min(0).max(3600).optional(),
    coolS: z.number().int().min(0).max(3600).optional(),
  });
  const parsed = Spec.safeParse(spec);
  if (!parsed.success) return { ok: false, error: "That day did not make sense" };
  const s = parsed.data;
  try {
    await growToWeek(programId, week);
    const program = await db.getProgram(programId);
    const existing = program?.days.find((x) => x.week === week && x.day === day);
    const kind = s.type === "rest" ? "rest" as const : s.type === "cross" ? "cross" as const : "run" as const;
    await db.saveDay(programId, {
      week, day, kind,
      runType: kind === "run" ? (s.type as "easy" | "long" | "tempo" | "intervals" | "recovery" | "race") : null,
      note: existing?.note ?? "",
      blocks: buildBlocks(s),
    });
    revalidatePath("/studio", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}
