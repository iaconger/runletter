// The creator's week, as it looks once someone has been writing it for a few months. Read-only here:
// in the real studio every one of these days is a tap.
import Link from "next/link";
import { DemoStudioShell } from "@/components/demo/DemoStudioShell";
import { DEMO_CREATORS, DEMO_RUNNERS, demoBoard } from "@/lib/demo";
import { RUN_TYPE_LABEL, addDays, toISODate } from "@/lib/types";
import { mondayOf } from "@/lib/calendar";

export const metadata = { title: "A creator's week" };
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fmt = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

export default function DemoStudio() {
  const c = DEMO_CREATORS[0]!;
  const today = toISODate(new Date());
  const monday = mondayOf(today);
  const dates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)));
  const board = demoBoard(today, c.handle);
  // The board shows a sample; the headline number is what the whole crew would add up to.
  const crewM = (board.reduce((a, r) => a + r.weekM, 0) / board.length) * c.runners;
  const runs = c.shape.filter((s) => s[1] === "run");
  const mins = c.shape.reduce((a, s) => a + s[4], 0);

  // Twelve weeks of the same week, so the rail looks like someone who has been at this a while.
  const rail = Array.from({ length: 10 }, (_, i) => {
    const n = 8 + i;
    const start = toISODate(addDays(monday, (n - 12) * 7));
    return { n, start, future: n > 12, empty: n > 13 };
  });

  return (
    <DemoStudioShell here="/demo/studio">
      <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(880px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
        <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
          <div className="rl-stack" style={{ gap: 2 }}>
            <span className="t-label c-muted rl-kicker">{fmt(dates[0]!)} to {fmt(dates[6]!)} · {c.name}</span>
            <h1 className="t-display-lg" style={{ margin: 0 }}>This week</h1>
          </div>
          <span className="rl-help">{runs.length} runs · {Math.floor(mins / 60)}h {mins % 60}m · going to {c.runners.toLocaleString()} people</span>
        </div>

        <section className="rl-crew" aria-label="This week at a glance">
          <div><span className="n">{c.runners.toLocaleString()}</span><span className="l">following your week</span></div>
          <div><span className="n">{Math.round(crewM / 1000).toLocaleString()}</span><span className="l">km run together</span></div>
          <div><span className="n">{Math.round((DEMO_RUNNERS.filter((r) => r.streak >= 2).length / DEMO_RUNNERS.length) * c.runners).toLocaleString()}</span><span className="l">on a streak</span></div>
          <div><span className="n">${((c.priceCents * c.runners) / 100).toLocaleString()}</span><span className="l">a month, before fees</span></div>
        </section>

        <nav className="rl-weekrail" aria-label="Weeks">
          {rail.map((r) => (
            <Link key={r.n} href="/demo/studio" data-on={r.n === 12 ? "true" : undefined} data-now={r.n === 12 ? "true" : undefined} data-empty={r.empty ? "true" : undefined}>
              <span className="wk">{r.n === 12 ? "This week" : `Week ${r.n}`}</span>
              <span className="dt">{fmt(r.start)}</span>
              <span className="fill" aria-hidden>
                {c.shape.map(([day, kind, runType]) => (
                  <i key={day} data-run={r.empty ? undefined : kind === "run" ? runType ?? "easy" : kind} />
                ))}
              </span>
              <span className="sum">{r.empty ? "empty" : `${runs.length} runs · ${Math.floor(mins / 60)}h`}</span>
            </Link>
          ))}
        </nav>

        <ol className="rl-publicweek rl-week-wide">
          {c.shape.map(([day, kind, runType, note, minutes]) => (
            <li key={day} data-run={kind === "run" ? runType ?? "easy" : kind}>
              <span className="dy">{DAYS[day - 1]}<i>{fmt(dates[day - 1]!)}</i></span>
              <span className="wh">
                {kind === "rest" ? "Rest" : kind === "cross" ? "Cross training" : runType ? RUN_TYPE_LABEL[runType] : "Run"}
                {minutes > 0 && <em> · {minutes} min</em>}
              </span>
              {note && <span className="nt">{note}</span>}
            </li>
          ))}
        </ol>

        <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-2)", alignItems: "flex-start" }}>
          <span className="t-heading">In your own studio, each of these is one tap</span>
          <span className="c-secondary" style={{ maxWidth: "58ch" }}>
            Pick a shape for the day, say how far or how long, say how fast. The week goes out on its own, and your
            runners get each day on their watch the morning it is due.
          </span>
          <Link href="/signup?as=creator" className="rl-btn rl-btn-secondary rl-btn-sm">Open a studio</Link>
        </div>
      </main>
    </DemoStudioShell>
  );
}
