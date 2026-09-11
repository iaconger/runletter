"use server";
// Server actions for the studio. Thin: validate with zod, call lib/db, revalidate.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Goal, Level, ProgramDay, Program, StartRule, Access } from "@/lib/types";
import * as db from "@/lib/db/programs";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";
  return { ok: false, error: msg };
}

export async function createProgramAction(formData: FormData) {
  const parsed = z
    .object({ title: z.string().trim().min(1).max(80), weeks: z.coerce.number().int().min(1).max(52), goal: Goal, level: Level })
    .safeParse({ title: formData.get("title"), weeks: formData.get("weeks"), goal: formData.get("goal"), level: formData.get("level") });
  if (!parsed.success) redirect("/studio/new?error=" + encodeURIComponent("Check the title, weeks, goal and level."));
  const id = await db.createProgram(parsed.data);
  revalidatePath("/studio");
  redirect(`/studio/programs/${id}`);
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
