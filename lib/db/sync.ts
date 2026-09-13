import "server-only";
// The sync queue. When a week is sent (or a runner enrols), every run day becomes one queued push per
// connected provider, for every runner on that program and for the creator themselves. A worker drains
// the queue; today only Garmin can accept a push, Strava is completion-only, COROS is file import.
// Runs with the service role: it reads tokens and writes rows for many users at once.

import { createAdminClient } from "@/lib/supabase/admin";
import { garminEnabled, garminPush } from "@/lib/integrations/garmin";
import { mapDay } from "@/lib/db/programs";
import { addDays, toISODate } from "@/lib/types";

const PUSHABLE = ["garmin"] as const;

/** Queue pushes for one week of a program: for the creator and every active enrolment with a pushable connection. */
export async function enqueueWeek(programId: string, week: number): Promise<{ queued: number }> {
  const admin = createAdminClient();
  if (!admin) return { queued: 0 };
  const { data: program } = await admin.from("programs").select("id, creator_id, start_rule, fixed_start_date").eq("id", programId).single();
  if (!program) return { queued: 0 };
  const { data: days } = await admin.from("program_days").select("id, week, day, kind").eq("program_id", programId).eq("week", week).eq("kind", "run");
  if (!days?.length) return { queued: 0 };

  // Who runs this program: enrolled followers plus the creator (who runs their own Letter).
  const { data: enrol } = await admin.from("enrollments").select("follower_id, start_date").eq("program_id", programId).eq("status", "active");
  const people = new Map<string, string | null>(); // user -> start date
  for (const e of enrol ?? []) people.set(e.follower_id, e.start_date);
  if (!people.has(program.creator_id)) people.set(program.creator_id, program.start_rule === "fixed" ? program.fixed_start_date : null);

  const userIds = [...people.keys()];
  const { data: conns } = await admin.from("connections").select("user_id, provider").in("user_id", userIds).in("provider", [...PUSHABLE]);
  if (!conns?.length) return { queued: 0 };

  const rows = [];
  for (const c of conns) {
    const start = people.get(c.user_id) ?? null;
    for (const d of days) {
      rows.push({
        user_id: c.user_id,
        program_day_id: d.id,
        provider: c.provider,
        scheduled_for: start ? toISODate(addDays(start, (d.week - 1) * 7 + (d.day - 1))) : null,
        status: "queued" as const,
      });
    }
  }
  const { error } = await admin.from("workout_pushes").upsert(rows, { onConflict: "user_id,program_day_id,provider", ignoreDuplicates: false });
  if (error) throw error;
  return { queued: rows.length };
}

/** Queue everything a runner should have once they connect a provider: the current and future weeks they are on. */
export async function enqueueForUser(userId: string, provider: (typeof PUSHABLE)[number]): Promise<{ queued: number }> {
  const admin = createAdminClient();
  if (!admin) return { queued: 0 };
  const today = toISODate(new Date());
  const { data: enrol } = await admin.from("enrollments").select("program_id, start_date").eq("follower_id", userId).eq("status", "active");
  const { data: own } = await admin.from("programs").select("id, fixed_start_date").eq("creator_id", userId).eq("is_letter", true);
  const targets = [...(enrol ?? []).map((e) => ({ programId: e.program_id, start: e.start_date })), ...(own ?? []).map((p) => ({ programId: p.id, start: p.fixed_start_date }))];
  let queued = 0;
  for (const t of targets) {
    if (!t.start) continue;
    const { data: days } = await admin.from("program_days").select("id, week, day").eq("program_id", t.programId).eq("kind", "run");
    const rows = (days ?? [])
      .map((d) => ({ user_id: userId, program_day_id: d.id, provider, scheduled_for: toISODate(addDays(t.start!, (d.week - 1) * 7 + (d.day - 1))), status: "queued" as const }))
      .filter((r) => r.scheduled_for >= today);
    if (rows.length) {
      await admin.from("workout_pushes").upsert(rows, { onConflict: "user_id,program_day_id,provider" });
      queued += rows.length;
    }
  }
  return { queued };
}

/** Drain up to `limit` queued pushes. Safe to run often; each row ends sent, failed or skipped. */
export async function processQueue(limit = 50): Promise<{ sent: number; failed: number; skipped: number }> {
  const admin = createAdminClient();
  const out = { sent: 0, failed: 0, skipped: 0 };
  if (!admin) return out;
  const { data: queue } = await admin.from("workout_pushes").select("*").eq("status", "queued").order("created_at").limit(limit);
  for (const p of queue ?? []) {
    if (p.provider !== "garmin" || !garminEnabled()) {
      // Leave it queued so it goes the day the provider is enabled; nothing to report.
      out.skipped++;
      continue;
    }
    try {
      const { data: d } = await admin.from("program_days").select("*").eq("id", p.program_day_id).single();
      const { data: blocks } = await admin.from("blocks").select("*").eq("program_day_id", p.program_day_id);
      const { data: c } = await admin.from("connections").select("access_token, refresh_token").eq("user_id", p.user_id).eq("provider", "garmin").single();
      if (!d || !c?.access_token) throw new Error("Missing day or connection");
      const day = mapDay(d, blocks ?? []);
      const ref = await garminPush({ token: c.access_token, secret: c.refresh_token ?? "" }, day, `RunLetter W${day.week}D${day.day}`, p.scheduled_for ?? toISODate(new Date()));
      await admin.from("workout_pushes").update({ status: "sent", external_ref: ref, sent_at: new Date().toISOString(), error: null }).eq("id", p.id);
      out.sent++;
    } catch (e) {
      await admin.from("workout_pushes").update({ status: "failed", error: e instanceof Error ? e.message.slice(0, 500) : "failed" }).eq("id", p.id);
      out.failed++;
    }
  }
  return out;
}
