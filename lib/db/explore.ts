import "server-only";
// Explore data: runs and creators from real published programs. Shared by Explore and Today's empty state.
import { getProfileById, getProgram, getMyAccess, type MyAccess } from "@/lib/db/programs";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { dayTitle } from "@/components/run/RunPieces";
import type { ExploreRun } from "@/lib/explore";
import type { Profile, Program } from "@/lib/types";

export type ExploreData = { popular: ExploreRun[]; fresh: ExploreRun[]; creators: { id: string; name: string; handle: string; avatarUrl: string | null; bio: string }[]; letters: Map<string, { program: Program; creator: Profile; access: MyAccess }> };

export async function realRuns(): Promise<ExploreData> {
  if (!isConfigured()) return { popular: [], fresh: [], creators: [], letters: new Map() };
  const supabase = await createClient();
  const { data: programs } = await supabase.from("programs").select("id, creator_id, title").eq("status", "published").order("published_at", { ascending: false }).limit(12);
  if (!programs?.length) return { popular: [], fresh: [], creators: [], letters: new Map() };
  const { data: pop } = await supabase.rpc("popular_runs", { p_limit: 8 });
  const cache = new Map<string, Awaited<ReturnType<typeof getProgram>>>();
  const load = async (id: string) => (cache.has(id) ? cache.get(id)! : (cache.set(id, await getProgram(id)), cache.get(id)!));
  const creatorsById = new Map<string, Awaited<ReturnType<typeof getProfileById>>>();
  const who = async (id: string) => (creatorsById.has(id) ? creatorsById.get(id)! : (creatorsById.set(id, await getProfileById(id)), creatorsById.get(id)!));
  const toRun = (p: NonNullable<Awaited<ReturnType<typeof getProgram>>>, dayId: string, c: NonNullable<Awaited<ReturnType<typeof getProfileById>>>, completions?: number): ExploreRun | null => {
    const d = p.days.find((x) => x.id === dayId);
    if (!d || d.kind !== "run") return null;
    return { key: d.id, title: d.note ? dayTitle(d) : dayTitle(d), day: d, creator: { name: c.displayName, handle: c.handle, avatarUrl: c.avatarUrl }, creatorId: c.id, programId: p.id, programTitle: p.title, completions, cover: p.coverUrl ?? undefined, goal: p.goal, runsPerWeek: p.days.filter((x) => x.week === d.week && x.kind === "run").length || undefined, fitHref: `/api/fit?program=${p.id}&week=${d.week}&day=${d.day}` };
  };
  const popular: ExploreRun[] = [];
  for (const row of pop ?? []) {
    const p = await load(row.program_id);
    const c = p ? await who(p.creatorId) : null;
    const r = p && c ? toRun(p, row.program_day_id, c, Number(row.completions)) : null;
    if (r) popular.push(r);
  }
  const fresh: ExploreRun[] = [];
  for (const pr of programs) {
    const p = await load(pr.id);
    const c = p ? await who(p.creatorId) : null;
    const first = p?.days.find((d) => d.week === 1 && d.kind === "run");
    const r = p && c && first ? toRun(p, first.id, c) : null;
    if (r && !popular.some((x) => x.key === r.key)) fresh.push(r);
  }
  const creators = [...creatorsById.values()].filter((c): c is NonNullable<typeof c> => !!c).map((c) => ({ id: c.id, name: c.displayName, handle: c.handle, avatarUrl: c.avatarUrl, bio: c.bio }));
  // Each creator's published Letter, with whether the viewer already has it: the Subscribe button on cards.
  const letters = new Map<string, { program: Program; creator: Profile; access: MyAccess }>();
  const { data: letterRows } = await supabase.from("programs").select("*").eq("status", "published").eq("is_letter", true).in("creator_id", creators.map((c) => c.id));
  for (const row of letterRows ?? []) {
    const p = await load(row.id);
    const c = p ? await who(p.creatorId) : null;
    if (p && c) letters.set(c.id, { program: p, creator: c, access: await getMyAccess(p) });
  }
  return { popular, fresh, creators, letters };
}


/** Runs from the creators you follow (subscribed or bought), newest weeks first. The calendar's drag tray. */
export async function followedRuns(limit = 12): Promise<ExploreRun[]> {
  if (!isConfigured()) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const [{ data: subs }, { data: buys }] = await Promise.all([
    supabase.from("subscriptions").select("creator_id").eq("follower_id", user.id).eq("status", "active"),
    supabase.from("purchases").select("program_id").eq("follower_id", user.id),
  ]);
  const creatorIds = [...new Set((subs ?? []).map((s) => s.creator_id))];
  const programIds = [...new Set((buys ?? []).map((b) => b.program_id))];
  if (!creatorIds.length && !programIds.length) return [];
  const q = supabase.from("programs").select("id, creator_id, title").eq("status", "published");
  const { data: programs } = creatorIds.length && programIds.length
    ? await q.or(`creator_id.in.(${creatorIds.join(",")}),id.in.(${programIds.join(",")})`)
    : creatorIds.length ? await q.in("creator_id", creatorIds) : await q.in("id", programIds);
  if (!programs?.length) return [];
  const out: ExploreRun[] = [];
  for (const pr of programs) {
    const p = await getProgram(pr.id);
    const c = p ? await getProfileById(p.creatorId) : null;
    if (!p || !c) continue;
    const runs = p.days.filter((d) => d.kind === "run").sort((a, b) => b.week - a.week || a.day - b.day);
    for (const d of runs.slice(0, 6)) {
      out.push({ key: d.id, title: dayTitle(d), day: d, creator: { name: c.displayName, handle: c.handle, avatarUrl: c.avatarUrl }, creatorId: c.id, programId: p.id, programTitle: p.title, cover: p.coverUrl ?? undefined, goal: p.goal, runsPerWeek: p.days.filter((x) => x.week === d.week && x.kind === "run").length || undefined, fitHref: `/api/fit?program=${p.id}&week=${d.week}&day=${d.day}` });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
