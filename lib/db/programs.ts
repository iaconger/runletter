// Program reads and writes against Supabase, through the anon client + RLS.
// Rows are snake_case (lib/database.types.ts); the app speaks camelCase (lib/types.ts). Map at this boundary only.

import "server-only";
import { createClient } from "@/lib/supabase/server";
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

export function mapProfile(r: Pick<ProfileRow, "id" | "handle" | "display_name" | "avatar_url" | "cover_url" | "bio" | "is_creator" | "links"> & { pace_5k_s?: number | null; stripe_charges_enabled?: boolean | null }): Profile {
  const links = (r.links && typeof r.links === "object" && !Array.isArray(r.links) ? r.links : {}) as Record<string, string>;
  return { id: r.id, handle: r.handle, displayName: r.display_name, avatarUrl: r.avatar_url, coverUrl: r.cover_url, bio: r.bio, isCreator: r.is_creator,
    pace5kS: r.pace_5k_s ?? null, stripeChargesEnabled: r.stripe_charges_enabled ?? false, links };
}

const PROFILE_COLS = "id, handle, display_name, avatar_url, cover_url, bio, is_creator, links, pace_5k_s, stripe_charges_enabled";

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

export async function createProgram(input: { title: string; weeks: number; goal: Program["goal"]; level: Program["level"]; isLetter?: boolean; fixedStartDate?: string | null; access?: Program["access"]; priceCents?: number | null }): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

export async function updateMyProfile(patch: Partial<Pick<Profile, "handle" | "displayName" | "bio" | "links" | "avatarUrl" | "coverUrl" | "isCreator" | "pace5kS">>) {
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
  if (patch.pace5kS !== undefined) row.pace_5k_s = patch.pace5kS;
  const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
  if (error) throw error;
}

// ---------- posts: updates to your runners, optionally pinned to a Letter or one workout ----------

export type Post = { id: string; body: string; createdAt: string; programId: string | null; programDayId: string | null };

export async function listMyPosts(programId?: string): Promise<Post[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let q = supabase.from("creator_posts").select("id, body, created_at, program_id, program_day_id").eq("creator_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (programId) q = q.eq("program_id", programId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at, programId: r.program_id, programDayId: r.program_day_id }));
}

export async function createPost(input: { body: string; programId?: string | null; programDayId?: string | null }): Promise<Post> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
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
  /** Weeks of a Letter are visible only once sent; plans are visible in full. */
  sent: boolean;
  intro: string;
};

/** What the signed-in runner is on this week: their most recent active enrolment, today's position in it, completions. */
export async function getMyWeek(today: string): Promise<RunnerWeek | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  let sent = true;
  let intro = "";
  if (program.isLetter) {
    const { data: issue } = await supabase.from("letter_issues").select("sent_at, intro").eq("program_id", program.id).eq("week", week).maybeSingle();
    sent = !!issue?.sent_at || program.creatorId === user.id;
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

export type ExtraRun = { id: string; date: string; name: string | null; distanceM: number | null; durationS: number | null };

/** Unplanned runs for a user in a date range (inclusive). */
export async function listExtras(userId: string, from: string, to: string): Promise<ExtraRun[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("extra_runs").select("id, run_date, name, distance_m, duration_s").eq("user_id", userId).gte("run_date", from).lte("run_date", to).order("run_date");
  return (data ?? []).map((r) => ({ id: r.id, date: r.run_date, name: r.name, distanceM: r.distance_m, durationS: r.duration_s }));
}

export type RunnerRow = { profile: Profile; programTitle: string; week: number; planned: number; done: number; extras: ExtraRun[]; lastRun: string | null };

/** Everyone enrolled in the creator's programs, with this week's score. */
export async function listMyRunners(today: string): Promise<RunnerRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

export type RunLogItem = { id: string; date: string; title: string; planned: boolean; distanceM: number | null; durationS: number | null; avgPaceS: number | null; source: "strava" | "manual" };

/** Everything the signed-in runner ran in a date range: planned days done, plus off-plan runs. Newest first. */
export async function listMyRuns(from: string, to: string): Promise<RunLogItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const [{ data: comps }, { data: extras }] = await Promise.all([
    supabase.from("completions").select("id, completed_at, distance_m, duration_s, avg_pace_s, source, program_day_id, enrollments!inner(follower_id)").eq("enrollments.follower_id", user.id).gte("completed_at", `${from}T00:00:00`).lte("completed_at", `${to}T23:59:59`),
    supabase.from("extra_runs").select("id, run_date, name, distance_m, duration_s, avg_pace_s, source").eq("user_id", user.id).gte("run_date", from).lte("run_date", to),
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
    ...(comps ?? []).map((c) => ({ id: c.id, date: c.completed_at.slice(0, 10), title: titleFor(c.program_day_id), planned: true, distanceM: c.distance_m, durationS: c.duration_s, avgPaceS: c.avg_pace_s, source: c.source as "strava" | "manual" })),
    ...(extras ?? []).map((x) => ({ id: x.id, date: x.run_date, title: x.name ?? "Run", planned: false, distanceM: x.distance_m, durationS: x.duration_s, avgPaceS: x.avg_pace_s, source: x.source as "strava" | "manual" })),
  ];
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// ---------- access (through RLS: a runner sees only their own rows) ----------

export type MyAccess = { signedIn: boolean; subscribed: boolean; purchased: boolean };

/** Does the signed-in runner already have this program: subscribed to its creator (Letter) or bought it (plan). */
export async function getMyAccess(program: Pick<Program, "id" | "creatorId">): Promise<MyAccess> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, subscribed: false, purchased: false };
  const [{ data: sub }, { data: buy }] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("follower_id", user.id).eq("creator_id", program.creatorId).eq("status", "active").maybeSingle(),
    supabase.from("purchases").select("id").eq("follower_id", user.id).eq("program_id", program.id).maybeSingle(),
  ]);
  return { signedIn: true, subscribed: !!sub, purchased: !!buy };
}
