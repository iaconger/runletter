"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import * as db from "@/lib/db/programs";
import * as billing from "@/lib/db/billing";
import { createClient } from "@/lib/supabase/server";
import { stripeEnabled } from "@/lib/stripe";
import { publicOriginFromHeaders } from "@/lib/origin";
import { track } from "@/lib/analytics";

export async function markDoneAction(formData: FormData) {
  const parsed = z.object({ enrollmentId: z.string().uuid(), programDayId: z.string().uuid() }).safeParse({ enrollmentId: formData.get("enrollmentId"), programDayId: formData.get("programDayId") });
  if (!parsed.success) return;
  await db.markDone(parsed.data.enrollmentId, parsed.data.programDayId);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) track("run_marked_done", { source: "manual", program_day_id: parsed.data.programDayId }, user.id);
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
  const { syncRecentStrava } = await import("@/lib/integrations/strava");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try { await syncRecentStrava(user.id, 90); } catch (e) { console.error("strava sync", e); }
  revalidatePath("/app", "layout");
  revalidatePath("/studio", "layout");
}

/** Subscribe to a creator's Letter or buy a plan. Free programs enrol at once; paid ones go to Stripe Checkout. */
export async function joinAction(formData: FormData) {
  const parsed = z.object({ programId: z.string().uuid(), back: z.string().startsWith("/").default("/app/explore") }).safeParse({ programId: formData.get("programId"), back: formData.get("back") || undefined });
  if (!parsed.success) return;
  const { programId, back } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(back)}`);
  const program = await billing.getSellable(programId);
  if (!program || program.status !== "published") redirect(`${back}?error=${encodeURIComponent("That program is not open.")}`);
  const access = await billing.getAccess(user.id, program);
  if ((program.isLetter && access.subscribed) || (!program.isLetter && access.purchased)) {
    await billing.enrol(user.id, program);
    redirect("/app");
  }
  const creator = await db.getProfileById(program.creatorId);
  if (!creator) redirect(back);
  if (!billing.isPaid(program, creator.stripeChargesEnabled)) {
    await billing.grantFree(user.id, program);
    track("checkout_completed", { kind: program.isLetter ? "letter" : "plan", program_id: program.id, creator_id: program.creatorId, amount_cents: 0, free: true }, user.id);
    revalidatePath("/app");
    redirect("/app?joined=1");
  }
  if (!stripeEnabled()) redirect(`${back}?error=${encodeURIComponent("Payments coming soon.")}`);
  const origin = await publicOriginFromHeaders();
  let url: string;
  try {
    url = await billing.createCheckout({ followerId: user.id, email: user.email, program, creatorName: creator.displayName || `@${creator.handle}`, origin, back });
  } catch (e) {
    console.error("checkout", e);
    redirect(`${back}?error=${encodeURIComponent("Checkout did not open. Try again.")}`);
  }
  track("checkout_started", { kind: program.isLetter ? "letter" : "plan", program_id: program.id, creator_id: program.creatorId, amount_cents: program.priceCents }, user.id);
  redirect(url);
}

/** Cancel a Letter subscription: at period end for Stripe, right away for free ones. */
export async function cancelSubscriptionAction(formData: FormData) {
  const creatorId = String(formData.get("creatorId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(creatorId)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try { await billing.cancelSubscription(user.id, creatorId); } catch (e) { console.error("cancel", e); }
  track("subscription_cancelled", { creator_id: creatorId }, user.id);
  revalidatePath("/app/you");
  revalidatePath("/app");
}
