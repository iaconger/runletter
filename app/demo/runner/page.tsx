// A runner's home once they follow a few people: their own month, with everyone else's week laid on it.
import Link from "next/link";
import { Mark } from "@/components/ui/Logo";
import { MonthGrid } from "@/components/runner/MonthGrid";
import { DEMO_FOLLOWING, DEMO_ON_NOW, demoFollowedDays, demoMine } from "@/lib/demo";
import { toISODate } from "@/lib/types";
import { distanceLabel, fmtDistance } from "@/lib/units";

export const metadata = { title: "A runner's home" };
export const dynamic = "force-dynamic";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function DemoRunnerHome({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const today = toISODate(new Date());
  const now = new Date();
  const shift = Math.max(-11, Math.min(2, Number(m) || 0));
  const first = new Date(now.getFullYear(), now.getMonth() + shift, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const lead = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - lead);
  const cells = Math.ceil((lead + last.getDate()) / 7) * 7;
  const from = iso(gridStart);
  const to = iso(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + cells - 1));

  const mine = demoMine(from, to);
  const theirs = demoFollowedDays(from, to);
  const monthRuns = mine.filter((x) => x.date.slice(0, 7) === iso(first).slice(0, 7));
  const monthM = monthRuns.reduce((a, x) => a + (x.distanceM ?? 0), 0);

  return (
    <div className="rl-app-shell rl-theme-paper"><div className="rl-app">
      <header className="rl-app-head">
        <span className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter"><Mark size={28} /></span>
        <nav className="rl-topnav" aria-label="Primary">
          <span aria-current="page">Home</span>
          <Link href="/demo">Explore</Link>
          <Link href="/demo">You</Link>
        </nav>
        <Link href="/signup" className="rl-btn rl-btn-ghost rl-btn-sm">Sign up</Link>
      </header>

      <div style={{ flex: 1 }}>
        <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1000px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
          <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
            <div className="rl-stack" style={{ gap: 2 }}>
              <span className="t-label c-muted rl-kicker">
                {monthRuns.length > 0 ? `${monthRuns.length} runs · ${fmtDistance(monthM, "km", { decimals: 0 })} ${distanceLabel("km")}` : "Your month"}
              </span>
              <h1 className="t-display-lg" style={{ margin: 0 }}>{MONTHS[first.getMonth()]}{first.getFullYear() !== now.getFullYear() ? ` ${first.getFullYear()}` : ""}</h1>
            </div>
            <div className="rl-row" style={{ gap: 6 }}>
              <Link href={`/demo/runner?m=${shift - 1}`} className="rl-btn rl-btn-ghost rl-btn-sm">←</Link>
              {shift !== 0 && <Link href="/demo/runner" className="rl-btn rl-btn-ghost rl-btn-sm">This month</Link>}
              <Link href={`/demo/runner?m=${shift + 1}`} className="rl-btn rl-btn-ghost rl-btn-sm">→</Link>
            </div>
          </div>

          <section className="rl-following" aria-label="People you follow">
            {DEMO_FOLLOWING.map((c) => (
              <Link key={c.id} href={`/c/${c.handle}`} title={`${c.name} · ${c.subscribed ? "subscribed" : "plan"}`}>
                <span className="rl-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="ini">{c.name[0]}</span>}
                </span>
                <span className="nm">{c.name.split(" ")[0]}</span>
              </Link>
            ))}
            <Link href="/demo" className="add">
              <span className="rl-avatar plus">+</span>
              <span className="nm">Find more</span>
            </Link>
          </section>

          <ul className="rl-onnow" aria-label="What you are running">
            {DEMO_ON_NOW.map((p) => (
              <li key={p.enrollmentId}>
                <Link href={`/c/${p.creator.handle}`}>
                  <span className="rl-avatar">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.creator.avatarUrl ? <img src={p.creator.avatarUrl} alt="" /> : <span className="ini">{p.creator.name[0]}</span>}
                  </span>
                  <span className="rl-stack" style={{ gap: 1, minWidth: 0 }}>
                    <b>{p.title}</b>
                    <span className="sub">{p.creator.name} · {p.isLetter ? `week ${p.week}` : `week ${p.week} of ${p.weeks}`}</span>
                  </span>
                  <span className="prog">
                    <span className="bar" aria-hidden><i style={{ width: `${p.runsThisWeek ? Math.round((p.doneThisWeek / p.runsThisWeek) * 100) : 0}%` }} /></span>
                    <span className="cnt">{p.doneThisWeek}/{p.runsThisWeek} this week</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <MonthGrid first={first} gridStart={gridStart} cells={cells} today={today} units="km" theirs={theirs} dropped={[]} mine={mine} links={false} />

          <span className="rl-help">Ticks are runs that came back from Strava on their own. The named blocks are what the people you follow put on that day.</span>
        </main>
      </div>
    </div></div>
  );
}
