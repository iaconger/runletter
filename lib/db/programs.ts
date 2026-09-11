// Program reads and writes against Supabase, through the anon client + RLS.
// Rows are snake_case (lib/database.types.ts); the app speaks camelCase (lib/types.ts). Map at this boundary only.

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/database.types";
import type { Block, Program, ProgramDay, Profile } from "@/lib/types";

type ProgramRow = Tables<"programs">;
type DayRow = Tables<"program_days">;
type BlockRow = Tables<"blocks">;
type ProfileRow = Tables<"profiles">;

export function mapBlock(r: BlockRow): Block {
  return {
    id: r.id,
    position: r.position,
    kind: r.kind,
    measure: r.measure,
    durationS: r.duration_s,
    distanceM: r.distance_m,
    targetEffort: r.target_effort,
    targetPaceMin: r.target_pace_min,
    targetPaceMax: r.target_pace_max,
    repeatGroup: r.repeat_group,
    repeatCount: r.repeat_count,
  };
}

export function mapDay(r: DayRow, blocks: BlockRow[]): ProgramDay {
  return {
    id: r.id,
    week: r.week,
    day: r.day,
    kind: r.kind,
    runType: r.run_type,
    note: r.note,
    blocks: blocks.filter((b) => b.program_day_id === r.id).sort((a, b) => a.position - b.position).map(mapBlock),
  };
}

export function mapProgram(r: ProgramRow, days: DayRow[] = [], blocks: BlockRow[] = []): Program {
  return {
    id: r.id,
    creatorId: r.creator_id,
    title: r.title,
    description: r.description,
    coverUrl: r.cover_url,
    goal: r.goal,
    level: r.level,
    weeks: r.weeks,
    startRule: r.start_rule,
    fixedStartDate: r.fixed_start_date,
    access: r.access,
    priceCents: r.price_cents,
    status: r.status,
    days: days.map((d) => mapDay(d, blocks)).sort((a, b) => a.week - b.week || a.day - b.day),
  };
}

export function mapProfile(r: Pick<ProfileRow, "id" | "handle" | "display_name" | "avatar_url" | "cover_url" | "bio" | "is_creator" | "links">): Profile {
  const links = (r.links && typeof r.links === "object" && !Array.isArray(r.links) ? r.links : {}) as Record<string, string>;
  return { id: r.id, handle: r.handle, displayName: r.display_name, avatarUrl: r.avatar_url, coverUrl: r.cover_url, bio: r.bio, isCreator: r.is_creator, links };
}

const PROFILE_COLS = "id, handle, display_name, avatar_url, cover_url, bio, is_creator, links";

// ---------- reads ----------

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", user.id).single();
  return data ? mapProfile(data) : null;
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("handle", handle).maybeSingle();
  return data ? mapProfile(data) : null;
}

export async function listMyPrograms(): Promise<Program[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("programs").select("*").eq("creator_id", user.id).order("updated_at", { ascending: false });
  return (data ?? []).map((r) => mapProgram(r));
}

export async function listPublishedPrograms(creatorId: string): Promise<Program[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").eq("creator_id", creatorId).eq("status", "published").order("published_at", { ascending: false });
  return (data ?? []).map((r) => mapProgram(r));
}

/** Full program with days and blocks. RLS decides whether days come back (creator, subscriber, or nothing). */
export async function getProgram(id: string): Promise<Program | null> {
  const supabase = await createClient();
  const { data: p } = await supabase.from("programs").select("*").eq("id", id).maybeSingle();
  if (!p) return null;
  const { data: days } = await supabase.from("program_days").select("*").eq("program_id", id);
  const dayIds = (days ?? []).map((d) => d.id);
  const { data: blocks } = dayIds.length ? await supabase.from("blocks").select("*").in("program_day_id", dayIds) : { data: [] as BlockRow[] };
  return mapProgram(p, days ?? [], blocks ?? []);
}

// ---------- writes ----------

export async function createProgram(input: { title: string; weeks: number; goal: Program["goal"]; level: Program["level"] }): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const row: TablesInsert<"programs"> = { creator_id: user.id, title: input.title, weeks: input.weeks, goal: input.goal, level: input.level };
  const { data, error } = await supabase.from("programs").insert(row).select("id").single();
  if (error) throw error;
  // Mark the account as a creator the first time they make a program.
  await supabase.from("profiles").update({ is_creator: true }).eq("id", user.id);
  return data.id;
}

export async function updateProgram(id: string, patch: Partial<Pick<Program, "title" | "description" | "goal" | "level" | "weeks" | "startRule" | "fixedStartDate" | "access" | "priceCents" | "coverUrl">>) {
  const supabase = await createClient();
  const row: Partial<TablesInsert<"programs">> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.goal !== undefined) row.goal = patch.goal;
  if (patch.level !== undefined) row.level = patch.level;
  if (patch.weeks !== undefined) row.weeks = patch.weeks;
  if (patch.startRule !== undefined) row.start_rule = patch.startRule;
  if (patch.fixedStartDate !== undefined) row.fixed_start_date = patch.fixedStartDate;
  if (patch.access !== undefined) row.access = patch.access;
  if (patch.priceCents !== undefined) row.price_cents = patch.priceCents;
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
  const { error } = await supabase.from("programs").update(row).eq("id", id);
  if (error) throw error;
}

export async function setProgramStatus(id: string, status: Program["status"]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

/** Replace one day and its blocks. Upserts the day on (program_id, week, day), then rewrites the blocks. */
export async function saveDay(programId: string, day: Omit<ProgramDay, "id"> & { id?: string }): Promise<string> {
  const supabase = await createClient();
  const dayRow: TablesInsert<"program_days"> = {
    program_id: programId,
    week: day.week,
    day: day.day,
    kind: day.kind,
    run_type: day.kind === "run" ? day.runType : null,
    note: day.note,
  };
  const { data: saved, error } = await supabase
    .from("program_days")
    .upsert(dayRow, { onConflict: "program_id,week,day" })
    .select("id")
    .single();
  if (error) throw error;
  const dayId = saved.id;

  const { error: delErr } = await supabase.from("blocks").delete().eq("program_day_id", dayId);
  if (delErr) throw delErr;
  if (day.kind === "run" && day.blocks.length) {
    const rows: TablesInsert<"blocks">[] = day.blocks.map((b, i) => ({
      program_day_id: dayId,
      position: i,
      kind: b.kind,
      measure: b.measure,
      duration_s: b.measure === "time" ? b.durationS : null,
      distance_m: b.measure === "distance" ? b.distanceM : null,
      target_effort: b.targetEffort,
      target_pace_min: b.targetPaceMin,
      target_pace_max: b.targetPaceMax,
      repeat_group: b.repeatGroup,
      repeat_count: b.repeatGroup ? b.repeatCount : null,
    }));
    const { error: insErr } = await supabase.from("blocks").insert(rows);
    if (insErr) throw insErr;
  }
  return dayId;
}

export async function clearDay(programId: string, week: number, day: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("program_days").delete().eq("program_id", programId).eq("week", week).eq("day", day);
  if (error) throw error;
}

/** Copy every day of `from` week into `to` week, replacing what's there. */
export async function duplicateWeek(programId: string, from: number, to: number) {
  const program = await getProgram(programId);
  if (!program) throw new Error("Program not found");
  for (const d of program.days.filter((x) => x.week === to)) await clearDay(programId, to, d.day);
  for (const d of program.days.filter((x) => x.week === from)) {
    const groups = new Map<string, string>();
    const blocks = d.blocks.map((b) => {
      let g: string | null = null;
      if (b.repeatGroup) {
        g = groups.get(b.repeatGroup) ?? crypto.randomUUID();
        groups.set(b.repeatGroup, g);
      }
      return { ...b, id: crypto.randomUUID(), repeatGroup: g };
    });
    await saveDay(programId, { ...d, week: to, blocks });
  }
}

export async function updateMyProfile(patch: Partial<Pick<Profile, "handle" | "displayName" | "bio" | "links" | "avatarUrl" | "coverUrl" | "isCreator">>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const row: Partial<TablesInsert<"profiles">> = {};
  if (patch.handle !== undefined) row.handle = patch.handle;
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.links !== undefined) row.links = patch.links;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
  if (patch.isCreator !== undefined) row.is_creator = patch.isCreator;
  const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
  if (error) throw error;
}
