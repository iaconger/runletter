// Explore. Runs you can do today from people worth following: popular this month, a run from each creator,
// and the creators themselves. Real published programs when there are any, the example set otherwise.
import Link from "next/link";
import { RunCard } from "@/components/run/RunCard";
import { EXAMPLE_CREATORS } from "@/components/ui/Ink";
import { SAMPLE_EXPLORE } from "@/lib/explore";
import { realRuns } from "@/lib/db/explore";

export const metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

export default async function Explore() {
  const real = await realRuns();
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
            {popular.map((r) => <RunCard key={r.key} r={r} />)}
          </div>
        </section>
      )}

      {fresh.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <h2 className="t-title" style={{ margin: 0 }}>{example ? "More from the crew" : "New from creators"}</h2>
          <div className="rl-grid2">
            {fresh.map((r) => <RunCard key={r.key} r={r} compact />)}
          </div>
        </section>
      )}

      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
        <h2 className="t-title" style={{ margin: 0 }}>Creators</h2>
        <div className="rl-grid2">
          {(example ? EXAMPLE_CREATORS.map((c) => ({ id: c.name, name: c.display, handle: c.name, avatarUrl: `/brand/photo/${c.name}.webp`, bio: `${c.focus} · ${c.city}` })) : real.creators).map((c) => (
            <Link key={c.id} href={`/c/${c.handle}`} className="rl-creatorcard">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="rl-avatar" style={{ width: 44, height: 44 }} />}
              <span className="rl-stack" style={{ gap: 0, minWidth: 0 }}>
                <span className="t-body-medium">{c.name}</span>
                <span className="rl-help" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.bio}</span>
              </span>
            </Link>
          ))}
        </div>
        {example && <p className="rl-help">Example creators, drawn not photographed. Real ones appear as they open their Letters.</p>}
      </section>
    </main>
  );
}
