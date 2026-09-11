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
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: /duplicate|unique/i.test(msg) ? "That handle is taken. Try another." : msg };
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
    return { ok: false, error: e instanceof Error ? e.message : "Could not save" };
  }
}

export async function saveImagesAction(input: { avatarUrl?: string | null; coverUrl?: string | null }): Promise<ActionResult> {
  const parsed = z.object({ avatarUrl: z.string().url().nullable().optional(), coverUrl: z.string().url().nullable().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad image URL" };
  try {
    await db.updateMyProfile(parsed.data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save" };
  }
}
