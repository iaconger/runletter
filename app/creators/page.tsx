// Landing for creators. Same vibe as the follower page, Dawn instead of Night.
// Sections: hero, why, how the studio works (01 02 03), a look at the editor, the money, what you don't have to do, CTA.

import Link from "next/link";
import { Lockup } from "@/components/ui/Logo";
import { Ink } from "@/components/ui/Ink";
import { CreatorRow } from "@/components/ui/CreatorRow";
import { Flipbook } from "@/components/ui/Flipbook";
import { RevealObserver } from "@/components/ui/Reveal";
import { BlockBar } from "@/components/run/BlockBar";
import { BlockList, CreatorNote, WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { sampleCreator, sampleProgram, sampleToday, sampleWeek } from "@/lib/sample";
import { dayDurationS, fmtMinutes } from "@/lib/types";

export const metadata = { title: "For creators" };

const delay = (ms: number) => ({ ["--reveal-delay" as string]: `${ms}ms` });

export default function CreatorsLanding() {
  return (
    <main>
      <RevealObserver />
      <header className="rl-page rl-wide rl-between" style={{ paddingBlock: "var(--rl-space-5)", alignItems: "center" }}>
        <Link href="/" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter home">
          <Lockup height={26} />
        </Link>
        <nav className="rl-row">
          <Link href="/" className="rl-btn rl-btn-ghost rl-btn-sm rl-nav-secondary">For runners</Link>
          <Link href="/c/sarah" className="rl-btn rl-btn-ghost rl-btn-sm rl-nav-secondary">Example creator</Link>
          <Link href="/signup?as=creator&next=/studio" className="rl-btn rl-btn-primary rl-btn-sm">Start a program</Link>
        </nav>
      </header>

      {/* ---------- hero ---------- */}
      <section className="rl-atmo rl-atmo-dawn" style={{ padding: "var(--rl-space-16) 0 var(--rl-space-12)", overflow: "hidden" }}>
        <div className="rl-page rl-wide rl-hero" style={{ paddingBlock: 0 }}>
          <div className="rl-stack" style={{ gap: "var(--rl-space-6)" }}>
            <p className="t-label" style={{ opacity: 0.7, margin: 0 }}>For running creators</p>
            <h1 className="t-display-xl" style={{ maxWidth: "14ch", margin: 0 }}>
              Turn your running programs into products.
            </h1>
            <p className="t-body" style={{ maxWidth: "46ch", opacity: 0.85, margin: 0 }}>
              Two things to sell. Your Letter: a week of running, written by you, sent to subscribers every Sunday night.
              And plans: a twelve-week block they buy once. Either way it lands on their watch. You write the runs. We handle the rest.
            </p>
            <div className="rl-row">
              <Link href="/signup?as=creator&next=/studio" className="rl-btn rl-btn-lg rl-btn-ink">
                Start your Letter
              </Link>
              <Link href="/c/sarah" className="rl-btn rl-btn-lg rl-btn-ghost">
                See a creator page
              </Link>
            </div>
            <p className="rl-help" style={{ color: "inherit", opacity: 0.7, margin: 0 }}>Free to use. You keep 80 percent of every subscription, all of it for your first 90 days.</p>
          </div>
          <div className="rl-stack" style={{ alignItems: "flex-end", gap: "var(--rl-space-3)" }}>
            <Ink name="pace-group" style={{ width: "min(100%, 460px)", opacity: 0.9 }} />
          </div>
        </div>
      </section>

      {/* ---------- why ---------- */}
      <section className="rl-page rl-wide" style={{ display: "grid", gap: "var(--rl-space-8)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", paddingBlock: "var(--rl-space-16) var(--rl-space-12)" }}>
        <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }} data-reveal>
          <span className="t-label c-muted">The problem</span>
          <h2 className="t-display-lg" style={{ margin: 0 }}>The DMs all say the same thing.</h2>
          <p className="c-secondary" style={{ margin: 0, maxWidth: "44ch" }}>
            &ldquo;What should I do this week?&rdquo; You answer it forty times, in comments, in stories, in a Google Doc you keep re-sharing. The plan lives in your head and your followers get pieces of it.
          </p>
        </div>
        <div className="rl-stack" style={{ gap: "var(--rl-space-3)", ...delay(120) }} data-reveal>
          <span className="t-label c-muted">The fix</span>
          <h2 className="t-display-lg" style={{ margin: 0 }}>Write it once. It goes out every Sunday.</h2>
          <p className="t-body-sm c-muted" style={{ margin: "var(--rl-space-2) 0 0" }}>Your words, your runs. RunLetter never generates a workout, and we say so to every runner.</p>
          <p className="c-secondary" style={{ margin: 0, maxWidth: "44ch" }}>
            A program in RunLetter is the plan, week by week, in your voice. Followers subscribe to you, the week lands before Monday, and each run goes to their watch with your note on it. You see who ran it.
          </p>
        </div>
      </section>

      {/* ---------- who this is for ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-5)", paddingBlock: "var(--rl-space-10)" }} data-reveal>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)", maxWidth: "44ch" }}>
            <span className="t-label c-muted">Who this is for</span>
            <h2 className="t-display-lg" style={{ margin: 0 }}>Anyone whose followers ask what to run.</h2>
          </div>
          <CreatorRow compact />
          <p className="rl-help">Example creators, drawn not photographed. If you see yourself in one of these, you&rsquo;re who we built it for.</p>
        </div>
      </section>

      {/* ---------- how the studio works ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-8)", paddingBlock: "var(--rl-space-12)" }}>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)", maxWidth: "40ch" }} data-reveal>
            <span className="t-label c-muted">How the studio works</span>
            <h2 className="t-display-lg" style={{ margin: 0 }}>An afternoon, not a product launch.</h2>
          </div>
          <div className="rl-steps">
            <div className="rl-step" data-reveal style={delay(0)}>
              <div className="rl-step-head"><span className="n">01</span></div>
              <h3 className="t-heading" style={{ margin: 0 }}>Lay out the weeks</h3>
              <p className="c-secondary" style={{ margin: 0 }}>Pick a goal and a length. Fill a week with easy, tempo, intervals, long and rest. Duplicate it, adjust it, keep going. Blocks and repeats, no spreadsheets.</p>
              <Ink name="intervals" style={{ width: "100%", opacity: 0.8, marginTop: "var(--rl-space-4)" }} />
            </div>
            <div className="rl-step" data-reveal style={delay(120)}>
              <div className="rl-step-head"><span className="n">02</span></div>
              <h3 className="t-heading" style={{ margin: 0 }}>Write the note on each day</h3>
              <p className="c-secondary" style={{ margin: 0 }}>One or two sentences. Why this run, what to feel, what to ignore. This is the part nobody else can write, and it&rsquo;s what followers open the app for.</p>
              <CreatorNote note={sampleToday.note} by={sampleCreator.displayName} />
            </div>
            <div className="rl-step" data-reveal style={delay(240)}>
              <div className="rl-step-head"><span className="n">03</span></div>
              <h3 className="t-heading" style={{ margin: 0 }}>Publish and share one link</h3>
              <p className="c-secondary" style={{ margin: 0 }}>Your page at runletter.com/c/you goes in your bio. Followers subscribe there, Stripe handles the money, and the week starts the Monday after they join.</p>
              <Ink name="route" style={{ width: "100%", opacity: 0.85, marginTop: "var(--rl-space-2)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- the editor ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)", paddingBlock: "var(--rl-space-12)" }}>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)", maxWidth: "44ch" }} data-reveal>
            <span className="t-label c-muted">The editor</span>
            <h2 className="t-display-lg" style={{ margin: 0 }}>A week is a row. A day is a card.</h2>
          </div>
          <div className="rl-card" data-reveal style={delay(100)}>
            <div className="rl-between">
              <span className="t-heading">{sampleProgram.title}</span>
              <span className="rl-chip rl-chip-success">Published</span>
            </div>
            <div className="rl-weekrow">
              <span className="w">Week 3</span>
              <WeekStrip days={sampleWeek} selectedDay={sampleToday.day} />
            </div>
            <div className="rl-hairline" />
            <div style={{ display: "grid", gap: "var(--rl-space-6)", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
                <span className="t-label c-muted">Thursday</span>
                <span className="t-title">{dayTitle(sampleToday)}</span>
                <span className="t-numeral-lg">{fmtMinutes(dayDurationS(sampleToday))}</span>
                <BlockBar blocks={sampleToday.blocks} legend={false} />
                <BlockList blocks={sampleToday.blocks} />
              </div>
              <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
                <div className="rl-field">
                  <label>Note to followers</label>
                  <textarea className="rl-input" defaultValue={sampleToday.note} readOnly />
                </div>
                <div className="rl-row">
                  <span className="rl-btn rl-btn-primary" aria-hidden="true">Save day</span>
                  <span className="rl-btn rl-btn-ghost" aria-hidden="true">Add block</span>
                </div>
              </div>
            </div>
          </div>
          <p className="rl-help">This is the real editor with an example program in it, not a mockup.</p>
        </div>
      </section>

      {/* ---------- the money ---------- */}
      <section className="rl-atmo rl-atmo-night" style={{ padding: "var(--rl-space-12) 0", overflow: "hidden" }}>
        <div className="rl-page rl-wide" style={{ paddingBlock: 0, display: "grid", gap: "var(--rl-space-8)", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", alignItems: "start" }} data-reveal>
          <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
            <span className="t-label" style={{ opacity: 0.6 }}>The money</span>
            <h2 className="t-display-lg" style={{ margin: 0 }}>Subscribe to a person, not an app.</h2>
            <p style={{ margin: 0, opacity: 0.85, maxWidth: "42ch" }}>You set the price, $5 to $10 a month. Followers pay you. We take 20 percent after Stripe fees, and nothing for your first 90 days. Payouts land in your bank through Stripe.</p>
          </div>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
            <span className="t-label" style={{ opacity: 0.6 }}>A working example</span>
            <span className="t-numeral-xl">$1,750</span>
            <span style={{ opacity: 0.8 }}>a month to you, from 250 subscribers at $7. That is half a percent of a 50K following.</span>
            <Ink name="cadence" tone="paper" style={{ width: "100%", opacity: 0.55, marginTop: "var(--rl-space-3)" }} />
          </div>
          <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
            <span className="t-label" style={{ opacity: 0.6 }}>What you don&rsquo;t have to do</span>
            <ul style={{ margin: 0, paddingLeft: "1.1em", opacity: 0.85, display: "grid", gap: 6 }}>
              <li>Build an app or a website</li>
              <li>Chase payments or handle refunds</li>
              <li>Answer &ldquo;what should I do this week&rdquo; forty times</li>
              <li>Export files for every watch brand</li>
              <li>Check who ran. Strava tells us, we tell you.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="rl-page rl-wide" style={{ display: "grid", gap: "var(--rl-space-8)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "center", paddingBlock: "var(--rl-space-16)" }} data-reveal>
        <div className="rl-stack" style={{ gap: "var(--rl-space-4)", alignItems: "flex-start" }}>
          <Flipbook tone="ink" width={140} />
          <h2 className="t-display-xl" style={{ margin: 0, maxWidth: "14ch" }}>Your first program is one afternoon away.</h2>
          <div className="rl-row">
            <Link href="/signup?as=creator&next=/studio" className="rl-btn rl-btn-primary rl-btn-lg">Start a program</Link>
            <Link href="/" className="rl-btn rl-btn-ghost rl-btn-lg">I&rsquo;m here to run</Link>
          </div>
          <p className="rl-help">The first creator cohort is small on purpose. If you have a following that runs, we want to talk.</p>
        </div>
        <Ink name="sequence" style={{ width: "100%", opacity: 0.85 }} />
      </section>

      <footer className="rl-page rl-wide rl-hairline rl-between" style={{ paddingBlock: "var(--rl-space-6)" }}>
        <span className="rl-help">RunLetter</span>
        <span className="rl-help">Subscriptions sold on the web. Nothing to buy in the app.</span>
      </footer>
    </main>
  );
}
