import "server-only";
// Runs on Explore and Today: popular and fresh from real published programs, creators alongside.
import { type ExploreRun } from "@/lib/explore";
import { getProfileById, getProgram } from "@/lib/db/programs";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { dayTitle } from "@/components/run/RunPieces";

export type ExploreFeed = { popular: ExploreRun[]; fresh: ExploreRun[]; creators: { id: string; name: string; handle: string; avatarUrl: string | null; bio: string }[] };

export async function realRuns(): Promise<ExploreFeed> {
  if (!isConfigured()) return { popular: [], fresh: [], creators: [] };
  const supabase = await createClient();
  const { data: programs } = await supabase.from("programs").select("id, creator_id, title").eq("status", "published").order("published_at", { ascending: false }).limit(12);
  if (!programs?.length) return { popular: [], fresh: [], creators: [] };
  const { data: pop } = await supabase.rpc("popular_runs", { p_limit: 8 });
  const cache = new Map<string, Awaited<ReturnType<typeof getProgram>>>();
  const load = async (id: string) => (cache.has(id) ? cache.get(id)! : (cache.set(id, await getProgram(id)), cache.get(id)!));
  const creatorsById = new Map<string, Awaited<ReturnType<typeof getProfileById>>>();
  const who = async (id: string) => (creatorsById.has(id) ? creatorsById.get(id)! : (creatorsById.set(id, await getProfileById(id)), creatorsById.get(id)!));
  const toRun = (p: NonNullable<Awaited<ReturnType<typeof getProgram>>>, dayId: string, c: NonNullable<Awaited<ReturnType<typeof getProfileById>>>, completions?: number): ExploreRun | null => {
    const d = p.days.find((x) => x.id === dayId);
    if (!d || d.kind !== "run") return null;
    return { key: d.id, title: d.note ? dayTitle(d) : dayTitle(d), day: d, creator: { name: c.displayName, handle: c.handle, avatarUrl: c.avatarUrl }, programId: p.id, programTitle: p.title, completions, fitHref: `/api/fit?program=${p.id}&week=${d.week}&day=${d.day}` };
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
  return { popular, fresh, creators };
}

