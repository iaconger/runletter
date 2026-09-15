"use server";
// Onboarding writes. Socials are stored as full URLs built from usernames so the public page never guesses.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as db from "@/lib/db/programs";
import type { ActionResult } from "@/app/studio/actions";

const SOCIAL_BASE: Record<string, (u: string) => string> = {
  instagram: (u) => `https://instagram.com/${u}`,
  strava: (u) => (/^\d+$/.test(u) ? `https://www.strava.com/athletes/${u}` : `https://www.strava.com/athletes/${u}`),
  youtube: (u) => `https://youtube.com/@${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Could not save");
const clean = (v: unknown) => String(v ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?[^/]+\/(@)?/, "").replace(/\/.*$/, "");

export async function saveIdentityAction(input: { handle: string; displayName: string; bio: string; isCreator: boolean }): Promise<ActionResult> {
  const parsed = z
    .object({
      handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Handle: 3 to 24 lowercase letters, numbers or underscores"),
      displayName: z.string().trim().min(1, "Add your name").max(60),
      bio: z.string().trim().max(500),
      isCreator: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  try {
    await db.updateMyProfile(parsed.data);
  } catch (e) {
    // Supabase errors are plain objects, not Error instances: read code and message off them.
    const err = e as { code?: string; message?: string } | Error;
    const code = "code" in err ? err.code : undefined;
    const msg = err instanceof Error ? err.message : err.message ?? "Could not save";
    return { ok: false, error: code === "23505" || /duplicate|unique/i.test(msg) ? "That handle is taken. Try another." : msg };
  }
  revalidatePath(`/c/${parsed.data.handle}`);
  return { ok: true };
}

export async function saveSocialsAction(input: Record<string, string>): Promise<ActionResult> {
  const links: Record<string, string> = {};
  for (const [k, build] of Object.entries(SOCIAL_BASE)) {
    const u = clean(input[k]);
    if (u && /^[A-Za-z0-9._-]{1,60}$/.test(u)) links[k] = build(u);
  }
  try {
    await db.updateMyProfile({ links });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function saveImagesAction(input: { avatarUrl?: string | null; coverUrl?: string | null }): Promise<ActionResult> {
  const parsed = z.object({ avatarUrl: z.string().url().nullable().optional(), coverUrl: z.string().url().nullable().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad image URL" };
  try {
    await db.updateMyProfile(parsed.data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Runner questionnaire: goal, race date, days a week, 5K time. All optional; the step is skippable. */
export async function saveRunningAction(input: { goal: string; raceDate: string; daysPerWeek: number | null; time5k: string }): Promise<ActionResult> {
  const { Goal } = await import("@/lib/types");
  const goal = Goal.safeParse(input.goal);
  const raceDate = /^\d{4}-\d{2}-\d{2}$/.test(input.raceDate) ? input.raceDate : null;
  const days = input.daysPerWeek && input.daysPerWeek >= 1 && input.daysPerWeek <= 7 ? Math.round(input.daysPerWeek) : null;
  const raw = input.time5k.trim();
  const parts = raw.split(":").map(Number);
  const s = parts.length === 2 ? parts[0]! * 60 + parts[1]! : parts.length === 3 ? parts[0]! * 3600 + parts[1]! * 60 + parts[2]! : NaN;
  const pace5kS = !raw ? null : Number.isFinite(s) && s >= 600 && s <= 3600 ? s : undefined;
  if (pace5kS === undefined) return { ok: false, error: "5K time like 24:30 (10:00 to 60:00)" };
  try {
    await db.updateMyProfile({ goal: goal.success ? goal.data : "other", raceDate, daysPerWeek: days, pace5kS });
    revalidatePath("/app");
    revalidatePath("/app/you");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
