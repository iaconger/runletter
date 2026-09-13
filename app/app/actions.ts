"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as db from "@/lib/db/programs";

export async function markDoneAction(formData: FormData) {
  const parsed = z.object({ enrollmentId: z.string().uuid(), programDayId: z.string().uuid() }).safeParse({ enrollmentId: formData.get("enrollmentId"), programDayId: formData.get("programDayId") });
  if (!parsed.success) return;
  await db.markDone(parsed.data.enrollmentId, parsed.data.programDayId);
  revalidatePath("/app");
}

export async function savePaceAction(formData: FormData) {
  const raw = String(formData.get("time5k") ?? "").trim();
  const parts = raw.split(":").map(Number);
  const s = parts.length === 2 ? parts[0]! * 60 + parts[1]! : parts.length === 3 ? parts[0]! * 3600 + parts[1]! * 60 + parts[2]! : NaN;
  if (!raw) await db.updateMyProfile({ pace5kS: null });
  else if (Number.isFinite(s) && s >= 600 && s <= 3600) await db.updateMyProfile({ pace5kS: s });
  revalidatePath("/app");
  revalidatePath("/app/you");
}

export async function syncStravaAction() {
  const { createClient } = await import("@/lib/supabase/server");
  const { syncRecentStrava } = await import("@/lib/integrations/strava");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try { await syncRecentStrava(user.id, 30); } catch (e) { console.error("strava sync", e); }
  revalidatePath("/app");
  revalidatePath("/app/you");
}
