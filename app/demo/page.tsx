// The front door of the walkthrough. Says what it is, then hands you the two sides of the app.
import Link from "next/link";
import { Ink } from "@/components/ui/Ink";
import { Mark } from "@/components/ui/Logo";
import { DEMO_CREATORS, DEMO_RUNNERS } from "@/lib/demo";
import { fmtPrice } from "@/lib/types";

export const metadata = { title: "See it working" };

const DOORS = [
  { href: "/demo/studio", kicker: "The creator's side", title: "Your week, written in about a minute", body: "Seven days, one tap each. Whatever you put here goes to everyone following you, on their watch, on the right morning." },
  { href: "/demo/studio/runners", kicker: "The creator's side", title: "The people running with you", body: "Who ran what this week, who is on a streak, who has gone quiet. This is the screen most creators open first." },
  { href: "/demo/runner", kicker: "The runner's side", title: "A month of somebody else's training", body: "Your own runs ticked off, the weeks of the people you follow laid on the days they belong on." },
  { href: "/c/sarah", kicker: "The public side", title: "The page you hand out", body: "One link. This week is visible to anyone; the detail is for the people who subscribe." },
];

export default function DemoIndex() {
  return (
    <main className="rl-theme-paper">
      <div className="rl-atmo rl-atmo-dawn" style={{ padding: "var(--rl-space-10) 0", overflow: "hidden" }}>
        <div className="rl-page rl-stack" style={{ paddingBlock: 0, gap: "var(--rl-space-4)", position: "relative" }}>
          <Ink name="pace-group" style={{ position: "absolute", right: "-8%", top: "-18%", width: "min(48%, 320px)", opacity: 0.8, pointerEvents: "none" }} />
          <Link href="/" className="rl-logo" style={{ color: "inherit" }} aria-label="RunLetter"><Mark size={28} /></Link>
          <span className="t-label c-muted rl-kicker">A walkthrough with made-up people</span>
          <h1 className="t-display-xl" style={{ margin: 0, maxWidth: "20ch" }}>This is RunLetter with a few hundred runners in it.</h1>
          <p className="t-body" style={{ margin: 0, maxWidth: "52ch" }}>
            Nobody below exists. The creators, the runners, the mileage and the weeks are all invented, so you can
            see what the app looks like once it is being used rather than on the day you sign up.
          </p>
        </div>
      </div>

      <section className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(980px + 2 * var(--rl-gutter))", gap: "var(--rl-space-4)" }}>
        <div className="rl-doors">
          {DOORS.map((d) => (
            <Link key={d.href} href={d.href} className="rl-card" style={{ color: "inherit", textDecoration: "none", gap: "var(--rl-space-2)" }}>
              <span className="t-label c-muted rl-kicker">{d.kicker}</span>
              <span className="t-heading">{d.title}</span>
              <span className="c-secondary">{d.body}</span>
              <span className="rl-help">Look →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(980px + 2 * var(--rl-gutter))", gap: "var(--rl-space-4)" }}>
        <div className="rl-between" style={{ alignItems: "baseline" }}>
          <h2 className="t-title" style={{ margin: 0 }}>The made-up creators</h2>
          <span className="rl-help">{DEMO_RUNNERS.length} invented runners between them</span>
        </div>
        <ul className="rl-castlist">
          {DEMO_CREATORS.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.handle}`}>
                <span className="rl-avatar lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.avatarUrl} alt="" loading="lazy" />
                </span>
                <span className="rl-stack" style={{ gap: 2, minWidth: 0 }}>
                  <b>{c.name}</b>
                  <span className="sub">{c.tagline} · {c.city}</span>
                  <span className="rl-help">{c.bio}</span>
                </span>
                <span className="rl-row" style={{ gap: 6, alignItems: "center", flex: "none" }}>
                  <span className="rl-chip">{c.runners.toLocaleString()} runners</span>
                  <span className="rl-chip rl-chip-accent">{c.priceCents === 0 ? "Free" : `${fmtPrice(c.priceCents)}/mo`}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rl-page rl-wide" style={{ maxWidth: "calc(980px + 2 * var(--rl-gutter))" }}>
        <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-3)", alignItems: "flex-start" }}>
          <span className="t-heading">Your page would look like theirs</span>
          <span className="c-secondary" style={{ maxWidth: "58ch" }}>
            Writing a week takes about a minute, once a week. Runners pay you monthly to follow it, and the runs land
            on their watch without either of you doing anything else.
          </span>
          <Link href="/signup?as=creator" className="rl-btn rl-btn-primary">Open a studio</Link>
        </div>
      </section>
    </main>
  );
}
