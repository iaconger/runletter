// Explore. Runs you can do today from people worth following: popular this month, a run from each creator,
// and the creators themselves. Real published programs when there are any, the example set otherwise.
import Link from "next/link";
import { RunCard } from "@/components/run/RunCard";
import { EXAMPLE_CREATORS } from "@/components/ui/Ink";
import { SAMPLE_EXPLORE, type ExploreRun } from "@/lib/explore";
import { getProfileById, getProgram, getMyAccess, type MyAccess } from "@/lib/db/programs";
import { JoinButton } from "@/components/run/JoinButton";
import type { Profile, Program } from "@/lib/types";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { dayTitle } from "@/components/run/RunPieces";

export const metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

async function realRuns(): Promise<{ popular: ExploreRun[]; fresh: ExploreRun[]; creators: { id: string; name: string; handle: string; avatarUrl: string | null; bio: string }[]; letters: Map<string, { program: Program; creator: Profile; access: MyAccess }> }> {
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
    return { key: d.id, title: d.note ? dayTitle(d) : dayTitle(d), day: d, creator: { name: c.displayName, handle: c.handle, avatarUrl: c.avatarUrl }, creatorId: c.id, programId: p.id, programTitle: p.title, completions, fitHref: `/api/fit?program=${p.id}&week=${d.week}&day=${d.day}` };
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

export default async function Explore() {
  const real = await realRuns();
  const joinFor = (creatorId: string | undefined, cls: string) => {
    const l = creatorId ? real.letters.get(creatorId) : undefined;
    return l ? <JoinButton program={l.program} creator={l.creator} access={l.access} back="/app/explore" className={cls} /> : null;
  };
  const example = real.fresh.length === 0 && real.popular.length === 0;
  const popular = example ? SAMPLE_EXPLORE.slice(0, 3) : real.popular;
  const fresh = example ? SAMPLE_EXPLORE.slice(3) : real.fresh;

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-7, 40px)" }}>
      <div className="rl-stack" style={{ gap: 2 }}>
        <h1 className="t-display-lg" style={{ margin: 0 }}>Explore</h1>
        <span className="c-secondary">Runs from people worth following. One tap to your watch.</span>
      </div>

      {popular.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <h2 className="t-title" style={{ margin: 0 }}>{example ? "Try one today" : "Popular this month"}</h2>
          </div>
          <div className="rl-rail">
            {popular.map((r) => <RunCard key={r.key} r={r} action={joinFor(r.creatorId, "rl-btn rl-btn-secondary rl-btn-sm")} />)}
          </div>
        </section>
      )}

      {fresh.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <h2 className="t-title" style={{ margin: 0 }}>{example ? "More from the crew" : "New from creators"}</h2>
          <div className="rl-grid2">
            {fresh.map((r) => <RunCard key={r.key} r={r} compact action={joinFor(r.creatorId, "rl-btn rl-btn-secondary rl-btn-sm")} />)}
          </div>
        </section>
      )}

      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
        <h2 className="t-title" style={{ margin: 0 }}>Creators</h2>
        <div className="rl-grid2">
          {(example ? EXAMPLE_CREATORS.map((c) => ({ id: c.name, name: c.display, handle: c.name, avatarUrl: `/brand/photo/${c.name}.webp`, bio: `${c.focus} · ${c.city}` })) : real.creators).map((c) => (
            <div key={c.id} className="rl-creatorcard">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="rl-avatar" style={{ width: 44, height: 44 }} />}
              <Link href={`/c/${c.handle}`} className="rl-stack" style={{ gap: 0, minWidth: 0, flex: 1, color: "inherit", textDecoration: "none" }}>
                <span className="t-body-medium">{c.name}</span>
                <span className="rl-help" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.bio}</span>
              </Link>
              {!example && joinFor(c.id, "rl-btn rl-btn-secondary rl-btn-sm")}
            </div>
          ))}
        </div>
        {example && <p className="rl-help">Example creators, drawn not photographed. Real ones appear as they open their Letters.</p>}
      </section>
    </main>
  );
}
