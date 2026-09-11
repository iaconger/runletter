import Link from "next/link";
import { Lockup } from "@/components/ui/Logo";
import { BlockBar } from "@/components/run/BlockBar";
import { CreatorNote, dayTitle } from "@/components/run/RunPieces";
import { sampleCreator, sampleToday } from "@/lib/sample";
import { dayDurationS, fmtMinutes } from "@/lib/types";

export default function Landing() {
  return (
    <main>
      <header className="rl-page rl-wide rl-between" style={{ paddingBlock: "var(--rl-space-5)", alignItems: "center" }}>
        <Link href="/" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter home">
          <Lockup height={26} />
        </Link>
        <nav className="rl-row">
          <Link href="/c/sarah" className="rl-btn rl-btn-ghost rl-btn-sm">
            Example creator
          </Link>
          <Link href="/login" className="rl-btn rl-btn-primary rl-btn-sm">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="rl-atmo rl-atmo-night" style={{ padding: "var(--rl-space-16) 0" }}>
        <div className="rl-page rl-wide rl-stack" style={{ paddingBlock: 0, gap: "var(--rl-space-6)" }}>
          <p className="t-label" style={{ opacity: 0.7 }}>
            Training programs from the runners you follow
          </p>
          <h1 className="t-display-xl" style={{ maxWidth: "14ch", margin: 0 }}>
            Today&rsquo;s run, written by your coach.
          </h1>
          <p className="t-body" style={{ maxWidth: "48ch", opacity: 0.85 }}>
            Creators build programs in the studio. You subscribe to a creator, open the app, and there is exactly one thing
            to do today. Send it to your watch, run it, and it marks itself done from Strava.
          </p>
          <div className="rl-row">
            <Link href="/login" className="rl-btn rl-btn-lg" style={{ background: "var(--rl-paper-100)", color: "var(--rl-ink-900)" }}>
              Start following
            </Link>
            <Link href="/studio" className="rl-btn rl-btn-lg rl-btn-ghost" style={{ color: "inherit", borderColor: "rgba(255,255,255,.3)" }}>
              I&rsquo;m a creator
            </Link>
          </div>
        </div>
      </section>

      <section className="rl-page rl-wide" style={{ display: "grid", gap: "var(--rl-space-8)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="rl-card">
          <span className="t-label c-muted">What a day looks like</span>
          <h2 className="t-display-lg" style={{ margin: 0 }}>
            {dayTitle(sampleToday)}
          </h2>
          <div className="rl-row">
            <span className="t-numeral-lg">{fmtMinutes(dayDurationS(sampleToday))}</span>
            <span className="rl-chip">Week 3 · Thu</span>
          </div>
          <BlockBar blocks={sampleToday.blocks} />
          <CreatorNote note={sampleToday.note} by={sampleCreator.displayName} />
          <span className="rl-help">Example program. Real programs come from the creators you subscribe to.</span>
        </div>
        <div className="rl-stack" style={{ gap: "var(--rl-space-6)" }}>
          <Feature title="One run a day" body="No calendars, no dashboards. The app opens on today. Yesterday and tomorrow are one swipe away." />
          <Feature title="To your watch" body="Every structured run exports as a .FIT workout for Garmin and Coros. Your watch guides the intervals." />
          <Feature title="Done from Strava" body="Connect Strava once. When the run lands there, the day is marked complete and the creator sees it." />
          <Feature title="Built by runners" body="Creators write programs in their own words. The note on each day is theirs, not a template." />
        </div>
      </section>

      <footer className="rl-page rl-wide rl-hairline rl-between" style={{ paddingBlock: "var(--rl-space-6)" }}>
        <span className="rl-help">RunLetter</span>
        <span className="rl-help">Sold on the web. Nothing to buy in the app.</span>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rl-stack" style={{ gap: "var(--rl-space-1)" }}>
      <h3 className="t-heading" style={{ margin: 0 }}>
        {title}
      </h3>
      <p className="c-secondary" style={{ margin: 0 }}>
        {body}
      </p>
    </div>
  );
}
