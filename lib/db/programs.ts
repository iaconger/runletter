// Program reads and writes against Supabase, through the anon client + RLS.
// Rows are snake_case (lib/database.types.ts); the app speaks camelCase (lib/types.ts). Map at this boundary only.

import "server-only";
import { createClient, currentUser } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { addDays, toISODate, type Block, type Program, type ProgramDay, type Profile, type LetterIssue } from "@/lib/types";

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
    isLetter: r.is_letter,
    days: days.map((d) => mapDay(d, blocks)).sort((a, b) => a.week - b.week || a.day - b.day),
  };
}

export function mapProfile(r: Pick<ProfileRow, "id" | "handle" | "display_name" | "avatar_url" | "cover_url" | "bio" | "is_creator" | "links"> & { pace_5k_s?: number | null; stripe_charges_enabled?: boolean | null; goal?: Program["goal"] | null; race_date?: string | null; days_per_week?: number | null; strava_stats?: unknown; units?: string | null }): Profile {
  const links = (r.links && typeof r.links === "object" && !Array.isArray(r.links) ? r.links : {}) as Record<string, string>;
  return { id: r.id, handle: r.handle, displayName: r.display_name, avatarUrl: r.avatar_url, coverUrl: r.cover_url, bio: r.bio, isCreator: r.is_creator,
    pace5kS: r.pace_5k_s ?? null, stripeChargesEnabled: r.stripe_charges_enabled ?? false, goal: r.goal ?? null, raceDate: r.race_date ?? null, daysPerWeek: r.days_per_week ?? null, stravaStats: r.strava_stats ?? null, units: r.units === "mi" ? "mi" : "km", links };
}

const PROFILE_COLS = "id, handle, display_name, avatar_url, cover_url, bio, is_creator, links, pace_5k_s, stripe_charges_enabled, units";
/** The signed-in user's own row also carries the questionnaire (not granted to anon). */
const MY_PROFILE_COLS = "id, handle, display_name, avatar_url, cover_url, bio, is_creator, links, pace_5k_s, stripe_charges_enabled, goal, race_date, days_per_week, strava_stats, strava_synced_at, units";

// ---------- reads ----------

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select(MY_PROFILE_COLS).eq("id", user.id).single();
  return data ? mapProfile(data) : null;
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("handle", handle).maybeSingle();
  return data ? mapProfile(data) : null;
}

export async function listMyPrograms(): Promise<Program[]> {
  const supabase = await createClient();
  const user = await currentUser();
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

export async function createProgram(input: { title: string; weeks: number; goal: Program["goal"]; level: Program["level"]; isLetter?: boolean; fixedStartDate?: string | null; access?: Program["access"]; priceCents?: number | null }): Promise<string> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  const row: TablesInsert<"programs"> = {
    creator_id: user.id,
    title: input.title,
    weeks: input.weeks,
    goal: input.goal,
    level: input.level,
    is_letter: input.isLetter ?? false,
    // The Letter is dated: everyone runs the same week. Plans roll: each buyer starts when they start.
    start_rule: input.isLetter ? "fixed" : "rolling",
    fixed_start_date: input.isLetter ? (input.fixedStartDate ?? null) : null,
    access: input.access ?? (input.isLetter ? "creator_sub" : "one_time"),
    // Letters default to $7 a month (pricing.md: $5 to 10, set by the creator; 0 keeps it free). Plans default to $29 once.
    price_cents: input.priceCents ?? (input.isLetter ? 700 : 2900),
  };
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

export async function updateMyProfile(patch: Partial<Pick<Profile, "handle" | "displayName" | "bio" | "links" | "avatarUrl" | "coverUrl" | "isCreator" | "pace5kS" | "goal" | "raceDate" | "daysPerWeek" | "units">>) {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  const row: Partial<TablesInsert<"profiles">> = {};
  if (patch.handle !== undefined) row.handle = patch.handle;
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.links !== undefined) row.links = patch.links;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
  if (patch.isCreator !== undefined) row.is_creator = patch.isCreator;
  if (patch.pace5kS !== undefined) row.pace_5k_s = patch.pace5kS;
  if (patch.goal !== undefined) row.goal = patch.goal;
  if (patch.raceDate !== undefined) row.race_date = patch.raceDate;
  if (patch.daysPerWeek !== undefined) row.days_per_week = patch.daysPerWeek;
  if (patch.units !== undefined) row.units = patch.units;
  const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
  if (error) throw error;
}

// ---------- posts: updates to your runners, optionally pinned to a Letter or one workout ----------

export type Post = { id: string; body: string; createdAt: string; programId: string | null; programDayId: string | null };

export async function listMyPosts(programId?: string): Promise<Post[]> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return [];
  let q = supabase.from("creator_posts").select("id, body, created_at, program_id, program_day_id").eq("creator_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (programId) q = q.eq("program_id", programId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at, programId: r.program_id, programDayId: r.program_day_id }));
}

export async function createPost(input: { body: string; programId?: string | null; programDayId?: string | null }): Promise<Post> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("creator_posts")
    .insert({ creator_id: user.id, body: input.body, program_id: input.programId ?? null, program_day_id: input.programDayId ?? null })
    .select("id, body, created_at, program_id, program_day_id")
    .single();
  if (error) throw error;
  return { id: data.id, body: data.body, createdAt: data.created_at, programId: data.program_id, programDayId: data.program_day_id };
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("creator_posts").delete().eq("id", id);
  if (error) throw error;
}

/** The creator's Letter, if they have started one. */
export async function getMyLetter(): Promise<Program | null> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return null;
  const { data } = await supabase.from("programs").select("*").eq("creator_id", user.id).eq("is_letter", true).maybeSingle();
  return data ? mapProgram(data) : null;
}

// ---------- letter issues: one per week, sent or scheduled by the creator ----------

export async function listIssues(programId: string): Promise<LetterIssue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("letter_issues").select("*").eq("program_id", programId).order("week");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, programId: r.program_id, week: r.week, intro: r.intro, scheduledFor: r.scheduled_for, sentAt: r.sent_at }));
}

export async function upsertIssue(input: { programId: string; week: number; intro?: string; scheduledFor?: string | null; sentAt?: string | null }): Promise<LetterIssue> {
  const supabase = await createClient();
  const row: TablesInsert<"letter_issues"> = { program_id: input.programId, week: input.week };
  if (input.intro !== undefined) row.intro = input.intro;
  if (input.scheduledFor !== undefined) row.scheduled_for = input.scheduledFor;
  if (input.sentAt !== undefined) row.sent_at = input.sentAt;
  const { data, error } = await supabase.from("letter_issues").upsert(row, { onConflict: "program_id,week" }).select("*").single();
  if (error) throw error;
  return { id: data.id, programId: data.program_id, week: data.week, intro: data.intro, scheduledFor: data.scheduled_for, sentAt: data.sent_at };
}

/** Enrol the signed-in user in a program from a given Monday. Creators use it for their own Letter. */
export async function enrolSelf(programId: string, startDate: string) {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("enrollments").insert({ follower_id: user.id, program_id: programId, start_date: startDate });
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

// ---------- the runner's week ----------

export type RunnerWeek = {
  program: Program;
  creator: Profile;
  enrollmentId: string;
  week: number;
  todayDay: number;
  weekStart: string;
  done: Set<number>;
  /** Kept for callers; every week is live now, so this is always true. */
  sent: boolean;
  intro: string;
};

/** What the signed-in runner is on this week: their most recent active enrolment, today's position in it, completions. */
export async function getMyWeek(today: string): Promise<RunnerWeek | null> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return null;
  const { data: enrol } = await supabase.from("enrollments").select("id, program_id, start_date").eq("follower_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!enrol) return null;
  const diff = Math.floor((addDays(today, 0).getTime() - addDays(enrol.start_date, 0).getTime()) / 86400000);
  if (diff < 0) return null;
  const week = Math.floor(diff / 7) + 1;
  const todayDay = (diff % 7) + 1;
  const program = await getProgram(enrol.program_id);
  if (!program || week > program.weeks) return null;
  const creator = await getProfileById(program.creatorId);
  if (!creator) return null;
  const dayIds = program.days.filter((d) => d.week === week).map((d) => d.id);
  const { data: comps } = dayIds.length ? await supabase.from("completions").select("program_day_id").eq("enrollment_id", enrol.id).in("program_day_id", dayIds) : { data: [] };
  const done = new Set((comps ?? []).map((c) => program.days.find((d) => d.id === c.program_day_id)?.day).filter((d): d is number => !!d));
  // Weeks are live the moment the creator writes them: no sending, no drafts. The intro line, if there is one,
  // is the creator's word about the week.
  const sent = true;
  let intro = "";
  if (program.isLetter) {
    const { data: issue } = await supabase.from("letter_issues").select("intro").eq("program_id", program.id).eq("week", week).maybeSingle();
    intro = issue?.intro ?? "";
  }
  return { program, creator, enrollmentId: enrol.id, week, todayDay, weekStart: toISODate(addDays(enrol.start_date, (week - 1) * 7)), done, sent, intro };
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle();
  return data ? mapProfile(data) : null;
}

/** Mark a day done by hand. */
export async function markDone(enrollmentId: string, programDayId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("completions").insert({ enrollment_id: enrollmentId, program_day_id: programDayId, source: "manual" });
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

export type ExtraRun = {
  id: string; date: string; name: string | null; distanceM: number | null; durationS: number | null;
  sportType: string; avgPaceS: number | null; elevationM: number | null; avgHr: number | null; kudos: number | null; polyline: string | null; stravaActivityId: string | null;
};
const EXTRA_COLS = "id, run_date, name, distance_m, duration_s, sport_type, avg_pace_s, elevation_m, avg_hr, kudos, polyline, strava_activity_id";
type ExtraRow = { id: string; run_date: string; name: string | null; distance_m: number | null; duration_s: number | null; sport_type: string; avg_pace_s: number | null; elevation_m: number | null; avg_hr: number | null; kudos: number | null; polyline: string | null; strava_activity_id: string | null };
const mapExtra = (r: ExtraRow): ExtraRun => ({ id: r.id, date: r.run_date, name: r.name, distanceM: r.distance_m, durationS: r.duration_s, sportType: r.sport_type, avgPaceS: r.avg_pace_s, elevationM: r.elevation_m, avgHr: r.avg_hr, kudos: r.kudos, polyline: r.polyline, stravaActivityId: r.strava_activity_id });

/** Unplanned runs for a user in a date range (inclusive). */
export async function listExtras(userId: string, from: string, to: string): Promise<ExtraRun[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("extra_runs").select(EXTRA_COLS).eq("user_id", userId).gte("run_date", from).lte("run_date", to).order("run_date");
  return (data ?? []).map(mapExtra);
}

export type RunnerRow = { profile: Profile; programTitle: string; week: number; planned: number; done: number; extras: ExtraRun[]; lastRun: string | null };

/** Everyone enrolled in the creator's programs, with this week's score. */
export async function listMyRunners(today: string): Promise<RunnerRow[]> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return [];
  const { data: programs } = await supabase.from("programs").select("id, title, weeks").eq("creator_id", user.id);
  if (!programs?.length) return [];
  const ids = programs.map((p) => p.id);
  const { data: enrol } = await supabase.from("enrollments").select("id, follower_id, program_id, start_date").in("program_id", ids).eq("status", "active");
  const rows: RunnerRow[] = [];
  for (const e of enrol ?? []) {
    const prog = programs.find((p) => p.id === e.program_id)!;
    const diff = Math.floor((addDays(today, 0).getTime() - addDays(e.start_date, 0).getTime()) / 86400000);
    const week = diff >= 0 ? Math.floor(diff / 7) + 1 : 0;
    const weekStart = toISODate(addDays(e.start_date, (week - 1) * 7));
    const weekEnd = toISODate(addDays(e.start_date, (week - 1) * 7 + 6));
    const [{ data: prof }, { data: days }] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLS).eq("id", e.follower_id).maybeSingle(),
      supabase.from("program_days").select("id, kind").eq("program_id", e.program_id).eq("week", week),
    ]);
    if (!prof) continue;
    const dayIds = (days ?? []).map((d) => d.id);
    const { data: comps } = dayIds.length ? await supabase.from("completions").select("program_day_id, completed_at").eq("enrollment_id", e.id).in("program_day_id", dayIds) : { data: [] };
    const { data: last } = await supabase.from("completions").select("completed_at").eq("enrollment_id", e.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();
    const extras = week > 0 ? await listExtras(e.follower_id, weekStart, weekEnd) : [];
    rows.push({ profile: mapProfile(prof), programTitle: prog.title, week, planned: (days ?? []).filter((d) => d.kind === "run").length, done: (comps ?? []).length, extras, lastRun: last?.completed_at ?? null });
  }
  return rows;
}

export type RunLogItem = {
  id: string; date: string; title: string; planned: boolean;
  distanceM: number | null; durationS: number | null; avgPaceS: number | null;
  source: "strava" | "manual";
  /** Set for planned runs: the program day this completed. */
  programDayId: string | null; programId: string | null;
  stravaActivityId: string | null;
  sportType: string; elevationM: number | null; avgHr: number | null; kudos: number | null; polyline: string | null;
};

/** Everything the signed-in runner ran in a date range: planned days done, plus off-plan runs. Newest first. */
export async function listMyRuns(from: string, to: string): Promise<RunLogItem[]> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return [];
  const [{ data: comps }, { data: extras }] = await Promise.all([
    supabase.from("completions").select("id, completed_at, distance_m, duration_s, avg_pace_s, source, program_day_id, strava_activity_id, enrollments!inner(follower_id, program_id)").eq("enrollments.follower_id", user.id).gte("completed_at", `${from}T00:00:00`).lte("completed_at", `${to}T23:59:59`),
    supabase.from("extra_runs").select("id, run_date, name, distance_m, duration_s, avg_pace_s, source, strava_activity_id, sport_type, elevation_m, avg_hr, kudos, polyline").eq("user_id", user.id).gte("run_date", from).lte("run_date", to),
  ]);
  const dayIds = (comps ?? []).map((c) => c.program_day_id);
  const { data: days } = dayIds.length ? await supabase.from("program_days").select("id, kind, run_type, week, day").in("id", dayIds) : { data: [] };
  const titleFor = (id: string) => {
    const d = (days ?? []).find((x) => x.id === id);
    if (!d) return "Run";
    const t = d.run_type ?? "run";
    return `${t[0]!.toUpperCase()}${t.slice(1)} · week ${d.week}`;
  };
  const items: RunLogItem[] = [
    ...(comps ?? []).map((c) => ({ id: c.id, date: c.completed_at.slice(0, 10), title: titleFor(c.program_day_id), planned: true, distanceM: c.distance_m, durationS: c.duration_s, avgPaceS: c.avg_pace_s, source: c.source as "strava" | "manual", programDayId: c.program_day_id, programId: (c.enrollments as unknown as { program_id: string }).program_id, stravaActivityId: c.strava_activity_id, sportType: "Run", elevationM: null, avgHr: null, kudos: null, polyline: null })),
    ...(extras ?? []).map((x) => ({ id: x.id, date: x.run_date, title: x.name ?? x.sport_type, planned: false, distanceM: x.distance_m, durationS: x.duration_s, avgPaceS: x.avg_pace_s, source: x.source as "strava" | "manual", programDayId: null, programId: null, stravaActivityId: x.strava_activity_id, sportType: x.sport_type, elevationM: x.elevation_m, avgHr: x.avg_hr, kudos: x.kudos, polyline: x.polyline })),
  ];
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** One logged run by id: a completion (planned) or an extra (off plan). Only the signed-in runner's own. */
export async function getMyRun(id: string): Promise<RunLogItem | null> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return null;
  const { data: c } = await supabase.from("completions").select("id, completed_at, distance_m, duration_s, avg_pace_s, source, program_day_id, strava_activity_id, enrollments!inner(follower_id, program_id)").eq("id", id).eq("enrollments.follower_id", user.id).maybeSingle();
  if (c) {
    const { data: d } = await supabase.from("program_days").select("run_type, week").eq("id", c.program_day_id).maybeSingle();
    const t = d?.run_type ?? "run";
    // The Strava row for this completion carries the rich fields (route, heart rate, elevation) if we have it.
    const { data: x } = c.strava_activity_id ? await supabase.from("extra_runs").select("sport_type, elevation_m, avg_hr, kudos, polyline").eq("strava_activity_id", c.strava_activity_id).eq("user_id", user.id).maybeSingle() : { data: null };
    return { id: c.id, date: c.completed_at.slice(0, 10), title: d ? `${t[0]!.toUpperCase()}${t.slice(1)} · week ${d.week}` : "Run", planned: true, distanceM: c.distance_m, durationS: c.duration_s, avgPaceS: c.avg_pace_s, source: c.source as "strava" | "manual", programDayId: c.program_day_id, programId: (c.enrollments as unknown as { program_id: string }).program_id, stravaActivityId: c.strava_activity_id, sportType: x?.sport_type ?? "Run", elevationM: x?.elevation_m ?? null, avgHr: x?.avg_hr ?? null, kudos: x?.kudos ?? null, polyline: x?.polyline ?? null };
  }
  const { data: x } = await supabase.from("extra_runs").select("id, run_date, name, distance_m, duration_s, avg_pace_s, source, strava_activity_id, sport_type, elevation_m, avg_hr, kudos, polyline").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!x) return null;
  return { id: x.id, date: x.run_date, title: x.name ?? x.sport_type, planned: false, distanceM: x.distance_m, durationS: x.duration_s, avgPaceS: x.avg_pace_s, source: x.source as "strava" | "manual", programDayId: null, programId: null, stravaActivityId: x.strava_activity_id, sportType: x.sport_type, elevationM: x.elevation_m, avgHr: x.avg_hr, kudos: x.kudos, polyline: x.polyline };
}

/** A program day with its program and creator, for the run detail page. RLS decides what the viewer may see. */
export async function getRunDay(dayId: string): Promise<{ program: Program; day: ProgramDay; creator: Profile } | null> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("program_days").select("program_id").eq("id", dayId).maybeSingle();
  if (!row) return null;
  const program = await getProgram(row.program_id);
  const day = program?.days.find((d) => d.id === dayId);
  if (!program || !day) return null;
  const creator = await getProfileById(program.creatorId);
  return creator ? { program, day, creator } : null;
}

// ---------- access (through RLS: a runner sees only their own rows) ----------

export type MyAccess = { signedIn: boolean; subscribed: boolean; purchased: boolean; own?: boolean };

/** Does the signed-in runner already have this program: subscribed to its creator (Letter) or bought it (plan). */
export async function getMyAccess(program: Pick<Program, "id" | "creatorId">): Promise<MyAccess> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { signedIn: false, subscribed: false, purchased: false };
  if (user.id === program.creatorId) return { signedIn: true, subscribed: true, purchased: true, own: true };
  const [{ data: sub }, { data: buy }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("follower_id", user.id).eq("creator_id", program.creatorId).eq("status", "active").maybeSingle(),
    supabase.from("purchases").select("id").eq("follower_id", user.id).eq("program_id", program.id).maybeSingle(),
  ]);
  return { signedIn: true, subscribed: !!sub, purchased: !!buy };
}

export type RunnerCalendar = { program: Program; creator: Profile; enrollmentId: string; start: string; currentWeek: number | null; doneIds: Set<string>; extras: ExtraRun[]; sentWeeks: Set<number> };

/** Everything for the runner's calendar: the whole program from their start date, what's done, and off-plan runs. */
export async function getMyCalendar(today: string): Promise<RunnerCalendar | null> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return null;
  const { data: enrol } = await supabase.from("enrollments").select("id, program_id, start_date").eq("follower_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!enrol) return null;
  const program = await getProgram(enrol.program_id);
  if (!program) return null;
  const creator = await getProfileById(program.creatorId);
  if (!creator) return null;
  const diff = Math.floor((addDays(today, 0).getTime() - addDays(enrol.start_date, 0).getTime()) / 86400000);
  const currentWeek = diff >= 0 && diff < program.weeks * 7 ? Math.floor(diff / 7) + 1 : null;
  const [{ data: comps }, extras] = await Promise.all([
    supabase.from("completions").select("program_day_id").eq("enrollment_id", enrol.id),
    listExtras(user.id, enrol.start_date, toISODate(addDays(enrol.start_date, program.weeks * 7 - 1))),
  ]);
  // Every week of the program is visible; nothing waits to be sent.
  const sentWeeks = new Set(Array.from({ length: program.weeks }, (_, i) => i + 1));
  return { program, creator, enrollmentId: enrol.id, start: enrol.start_date, currentWeek, doneIds: new Set((comps ?? []).map((c) => c.program_day_id)), extras, sentWeeks };
}

/** One of the signed-in user's own Strava activities. */
export async function getMyExtra(id: string): Promise<ExtraRun | null> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return null;
  const { data } = await supabase.from("extra_runs").select(EXTRA_COLS).eq("id", id).eq("user_id", user.id).maybeSingle();
  return data ? mapExtra(data) : null;
}

// ---------- scheduled runs (a creator's run dragged onto the runner's own calendar) ----------

export type ScheduledRun = { id: string; date: string; day: ProgramDay; programId: string; programTitle: string; creator: { name: string; handle: string } };

/** Runs the signed-in runner has put on their calendar, in a date range (inclusive). */
export async function listScheduled(from: string, to: string): Promise<ScheduledRun[]> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return [];
  const { data: rows } = await supabase.from("scheduled_runs").select("id, run_date, program_day_id").eq("user_id", user.id).gte("run_date", from).lte("run_date", to).order("run_date");
  if (!rows?.length) return [];
  const { data: days } = await supabase.from("program_days").select("*").in("id", rows.map((r) => r.program_day_id));
  if (!days?.length) return [];
  const { data: blocks } = await supabase.from("blocks").select("*").in("program_day_id", days.map((d) => d.id));
  const { data: programs } = await supabase.from("programs").select("id, title, creator_id").in("id", [...new Set(days.map((d) => d.program_id))]);
  const { data: people } = await supabase.from("profiles").select("id, display_name, handle").in("id", [...new Set((programs ?? []).map((p) => p.creator_id))]);
  const dayById = new Map(days.map((d) => [d.id, mapDay(d, (blocks ?? []).filter((b) => b.program_day_id === d.id))]));
  const progById = new Map((programs ?? []).map((p) => [p.id, p]));
  const rawById = new Map(days.map((d) => [d.id, d]));
  const whoById = new Map((people ?? []).map((p) => [p.id, p]));
  const out: ScheduledRun[] = [];
  for (const r of rows) {
    const day = dayById.get(r.program_day_id);
    const prog = progById.get(rawById.get(r.program_day_id)?.program_id ?? "");
    const who = prog ? whoById.get(prog.creator_id) : null;
    if (day && prog) out.push({ id: r.id, date: r.run_date, day, programId: prog.id, programTitle: prog.title, creator: { name: who?.display_name ?? "", handle: who?.handle ?? "" } });
  }
  return out;
}

/** Put a run on a day. Idempotent: dropping the same run on the same day twice changes nothing. */
export async function scheduleRun(programDayId: string, date: string) {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("scheduled_runs").upsert({ user_id: user.id, program_day_id: programDayId, run_date: date }, { onConflict: "user_id,run_date,program_day_id" });
  if (error) throw error;
}

export async function moveScheduled(id: string, date: string) {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  await supabase.from("scheduled_runs").update({ run_date: date }).eq("id", id).eq("user_id", user.id);
}

export async function unscheduleRun(id: string) {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  await supabase.from("scheduled_runs").delete().eq("id", id).eq("user_id", user.id);
}
