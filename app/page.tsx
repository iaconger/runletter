// Landing. Vibe: "Kitchen Table, Sunday Night". Hand-inked training journal meets railway timetable.
// Sections: hero (flipbook + week timetable), how it works (01 02 03), the week arrives, devices, for creators, final CTA.

import Link from "next/link";
import { Lockup } from "@/components/ui/Logo";
import { HeaderTone } from "@/components/ui/HeaderTone";
import { EXAMPLE_CREATORS, Ink, Portrait } from "@/components/ui/Ink";
import { CreatorRow } from "@/components/ui/CreatorRow";
import { Flipbook } from "@/components/ui/Flipbook";
import { RevealObserver } from "@/components/ui/Reveal";
import { BlockBar } from "@/components/run/BlockBar";
import { CreatorNote, dayShort, dayTitle } from "@/components/run/RunPieces";
import { sampleCreator, sampleToday, sampleWeek } from "@/lib/sample";
import { DAY_NAMES, dayDurationS, fmtMinutes } from "@/lib/types";

function Timetable({ light = false }: { light?: boolean }) {
  return (
    <div className="rl-timetable" data-light={light ? "true" : undefined}>
      {DAY_NAMES.map((n, i) => {
        const d = sampleWeek.find((x) => x.day === i + 1)!;
        const rest = d.kind === "rest";
        return (
          <div key={n} data-rest={rest ? "true" : undefined} data-today={d.day === sampleToday.day ? "true" : undefined}>
            <span className="d">{n}</span>
            <span className="k">{rest ? "Rest" : dayShort(d).replace(/\s\d+$/, "")}</span>
            <span className="m">{rest ? "" : fmtMinutes(dayDurationS(d))}</span>
          </div>
        );
      })}
    </div>
  );
}

function Noodle({ className = "" }: { className?: string }) {
  return (
    <svg className={`rl-noodle ${className}`} viewBox="0 0 200 40" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="M4 30 C 60 30, 80 6, 140 8 S 190 22, 196 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 5" />
      <path d="M188 6 L 197 12 L 189 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const delay = (ms: number) => ({ ["--reveal-delay" as string]: `${ms}ms` });

export default function Landing() {
  return (
    <main>
      <RevealObserver />
      <Link href="/creators" className="rl-announce">
        <span className="dot" aria-hidden="true" />
        <span>First creator cohort now open. Keep 100 percent for 90 days.</span>
        <span className="arrow" aria-hidden="true">→</span>
      </Link>
      <HeaderTone />
      <header className="rl-header">
        <div className="rl-page rl-wide rl-between" style={{ paddingBlock: "var(--rl-space-3)", alignItems: "center" }}>
          <Link href="/" className="rl-logo" aria-label="RunLetter home">
            <Lockup height={26} />
          </Link>
          <nav className="rl-row">
            <Link href="/c/sarah" className="rl-btn rl-btn-ghost rl-btn-sm rl-nav-secondary">Example creator</Link>
            <Link href="/creators" className="rl-btn rl-btn-ghost rl-btn-sm rl-nav-secondary">For creators</Link>
            <Link href="/login" className="rl-btn rl-btn-ghost rl-btn-sm">Sign in</Link>
            <Link href="/signup" className="rl-btn rl-btn-primary rl-btn-sm">Sign up</Link>
          </nav>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="rl-atmo rl-atmo-night rl-hero-photo" style={{ padding: "var(--rl-space-16) 0 var(--rl-space-12)", overflow: "hidden" }}>
        <div className="rl-reel" aria-hidden="true">
          <div className="rl-reel-frame" style={{ backgroundImage: "url(/brand/photo/hero-ugc-1.webp)" }} />
          <div className="rl-reel-frame" style={{ backgroundImage: "url(/brand/photo/hero-ugc-2.webp)" }} />
          <div className="rl-reel-frame" style={{ backgroundImage: "url(/brand/photo/hero-ugc-3.webp)" }} />
          <div className="rl-reel-shade" />
        </div>
        <div className="rl-page rl-wide rl-hero" style={{ paddingBlock: 0, position: "relative", zIndex: 1 }}>
          <div className="rl-stack" style={{ gap: "var(--rl-space-6)" }}>
            <p className="t-label rl-rise" style={{ opacity: 0.7, margin: 0 }}>Find the runners who inspire you</p>
            <h1 className="t-display-hero rl-rise" style={{ maxWidth: "12ch", margin: 0, ["--rise-delay" as string]: "80ms" }}>
              Train alongside the runners who inspire you.
            </h1>
            <p className="t-title rl-rise" style={{ margin: 0, maxWidth: "30ch", ["--rise-delay" as string]: "160ms" }}>
              This week, run with a{" "}
              <span className="rl-rotate" aria-hidden="true">
                <span>marathon coach.</span>
                <span>trail runner.</span>
                <span>run club captain.</span>
                <span>comeback runner.</span>
                <span>5K speed freak.</span>
              </span>
              <span className="sr-only">runner you admire.</span>
            </p>
            <p className="t-body rl-rise" style={{ maxWidth: "46ch", opacity: 0.85, margin: 0, ["--rise-delay" as string]: "240ms" }}>
              Pick a creator whose running you admire. Their week lands in your app Sunday night, one run a day, already on
              your watch, marked done the moment it hits Strava. You&rsquo;re not following a plan. You&rsquo;re running with them.
            </p>
            <div className="rl-row rl-rise" style={{ ["--rise-delay" as string]: "320ms" }}>
              <Link href="/signup" className="rl-btn rl-btn-lg rl-btn-paper rl-btn-shine">
                Find your runner
              </Link>
              <Link href="/creators" className="rl-btn rl-btn-lg rl-btn-secondary">
                I&rsquo;m the runner people follow
              </Link>
            </div>
            <div className="rl-row rl-rise" style={{ gap: "var(--rl-space-3)", ["--rise-delay" as string]: "400ms" }}>
              <span className="rl-avatar-row">
                {EXAMPLE_CREATORS.slice(0, 4).map((c) => (
                  <Portrait key={c.name} name={c.name} size={36} tone="paper" style={{ borderColor: "var(--rl-ink-900)", borderWidth: 2 }} />
                ))}
              </span>
              <p className="rl-help" style={{ color: "inherit", opacity: 0.7, margin: 0 }}>Coaches, club captains, the runner whose posts get you out the door.</p>
            </div>
            <div className="rl-works rl-rise" style={{ ["--rise-delay" as string]: "480ms" }} aria-label="Works with">
              <span className="lbl">Works with</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="wm"><img src="/brand/partners/strava-96.png" alt="" width={18} height={18} style={{ borderRadius: 4 }} />Strava</span>
              <span className="wm">Garmin</span>
              <span className="wm">COROS</span>
              <span className="wm soon">Apple Fitness <em>soon</em></span>
            </div>
          </div>
          <div aria-hidden="true" />
        </div>
        <div className="rl-page rl-wide rl-rise" style={{ paddingBlock: "var(--rl-space-10) 0", position: "relative", zIndex: 1, ["--rise-delay" as string]: "520ms" }}>
          <p className="t-label" style={{ opacity: 0.6, margin: "0 0 var(--rl-space-2)" }}>Week 3 · Base building for busy people · what a week looks like</p>
          <div className="rl-track">
            <Flipbook tone="paper" width={120} className="rl-runner" />
            <div className="rl-tt-wrap"><Timetable light /></div>
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-8)", paddingBlock: "var(--rl-space-16) var(--rl-space-12)" }}>
        <div className="rl-stack" style={{ gap: "var(--rl-space-2)", maxWidth: "40ch" }} data-reveal>
          <span className="t-label c-muted">How it works</span>
          <h2 className="t-display-lg" style={{ margin: 0 }}>Three moves. One of them is running.</h2>
        </div>
        <div className="rl-steps">
          <div className="rl-step" data-reveal style={delay(0)}>
            <div className="rl-step-head"><span className="n">01</span><Noodle /></div>
            <h3 className="t-heading" style={{ margin: 0 }}>A creator writes the week</h3>
            <p className="c-secondary" style={{ margin: 0 }}>Easy, tempo, intervals, long. In their own words, with a note on every day. Built in the studio, published Sunday.</p>
            <Ink name="sequence" style={{ width: "100%", opacity: 0.85, marginTop: "var(--rl-space-2)" }} />
          </div>
          <div className="rl-step" data-reveal style={delay(120)}>
            <div className="rl-step-head"><span className="n">02</span><Noodle /></div>
            <h3 className="t-heading" style={{ margin: 0 }}>It arrives before you need it</h3>
            <p className="c-secondary" style={{ margin: 0 }}>Subscribe to the creator and the whole week is in your app the night before. Open it Monday. There is one thing to do.</p>
            <Ink name="cadence" style={{ width: "100%", opacity: 0.7, marginTop: "var(--rl-space-6)" }} />
          </div>
          <div className="rl-step" data-reveal style={delay(240)}>
            <div className="rl-step-head"><span className="n">03</span></div>
            <h3 className="t-heading" style={{ margin: 0 }}>Send it to your watch and go</h3>
            <p className="c-secondary" style={{ margin: 0 }}>One tap puts the intervals on your Garmin or Coros. Run. When it shows up on Strava, the day checks itself off.</p>
            <Ink name="route" style={{ width: "100%", opacity: 0.85, marginTop: "var(--rl-space-2)" }} />
          </div>
        </div>
      </section>

      {/* ---------- the week arrives ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide" style={{ display: "grid", gap: "var(--rl-space-8)", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start", paddingBlock: "var(--rl-space-12)" }}>
          <div className="rl-stack" style={{ gap: "var(--rl-space-4)" }} data-reveal>
            <span className="t-label c-muted">Sunday night</span>
            <h2 className="t-display-lg" style={{ margin: 0 }}>The week shows up like a letter.</h2>
            <p className="c-secondary" style={{ margin: 0, maxWidth: "44ch" }}>
              Not a calendar to manage. Not a dashboard to check. Seven days from a coach who runs, posted to you before Monday, with a note on each one so you know why it matters.
            </p>
            <div className="rl-tt-wrap"><Timetable /></div>
            <p className="rl-help">Example week from a creator&rsquo;s program. Yours comes from whoever you follow.</p>
          </div>
          <div className="rl-card" data-reveal style={delay(120)}>
            <span className="t-label c-muted">Thursday</span>
            <h3 className="t-display-lg" style={{ margin: 0 }}>{dayTitle(sampleToday)}</h3>
            <div className="rl-row">
              <span className="t-numeral-lg">{fmtMinutes(dayDurationS(sampleToday))}</span>
              <span className="rl-chip rl-chip-accent">Today</span>
            </div>
            <BlockBar blocks={sampleToday.blocks} />
            <CreatorNote note={sampleToday.note} by={sampleCreator.displayName} />
            <div className="rl-row">
              <span className="rl-btn rl-btn-primary" aria-hidden="true">Send to watch</span>
              <span className="rl-btn rl-btn-secondary" aria-hidden="true">Mark done</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- written by a person ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-human" data-reveal>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)", maxWidth: "36ch" }}>
            <span className="t-label c-muted">A promise</span>
            <h2 className="t-display-lg" style={{ margin: 0 }}>No AI writes the running.</h2>
          </div>
          <p className="t-body c-secondary" style={{ margin: 0, maxWidth: "48ch" }}>
            Every week on RunLetter is written by the runner whose name is on it. We deliver it to your watch; we never generate it. If a plan says Sarah, Sarah wrote it.
          </p>
        </div>
      </section>

      {/* ---------- creators ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)", paddingBlock: "var(--rl-space-12)" }} data-reveal>
          <div className="rl-between" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="rl-stack" style={{ gap: "var(--rl-space-2)", maxWidth: "40ch" }}>
              <span className="t-label c-muted">Written by people who run</span>
              <h2 className="t-display-lg" style={{ margin: 0 }}>Follow the runner, not the app.</h2>
            </div>
            <Link href="/creators" className="rl-btn rl-btn-ghost">I&rsquo;m a creator →</Link>
          </div>
          <CreatorRow />
          <p className="rl-help">Example creators. The first cohort is being recruited now, so these are the kinds of runners you&rsquo;ll find here, not the roster.</p>
        </div>
      </section>

      {/* ---------- devices ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)", paddingBlock: "var(--rl-space-12)" }} data-reveal>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)", maxWidth: "44ch" }}>
            <span className="t-label c-muted">Runs where you already run</span>
            <h2 className="t-display-lg" style={{ margin: 0 }}>Your watch does the coaching. Strava keeps the score.</h2>
          </div>
          <div className="rl-devices">
            <div className="rl-device"><span className="rl-chip rl-chip-success" style={{ alignSelf: "flex-start" }}>Now</span><span className="t">Garmin</span><span className="s">Every structured run exports as a .FIT workout. Import to Garmin Connect, it syncs to the watch, the watch beeps you through the intervals.</span></div>
            <div className="rl-device"><span className="rl-chip rl-chip-success" style={{ alignSelf: "flex-start" }}>Now</span><span className="t">Coros</span><span className="s">Same .FIT file, straight into the Coros app. Pace targets and rest blocks come with it.</span></div>
            <div className="rl-device"><span className="rl-chip rl-chip-success" style={{ alignSelf: "flex-start" }}>Now</span><span className="t rl-row" style={{ gap: 8, alignItems: "center" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/partners/strava-96.png" alt="" width={22} height={22} style={{ borderRadius: 5 }} />Strava</span><span className="s">Connect once. When your run lands on Strava, the day is marked done and your creator sees you did it.</span></div>
            <div className="rl-device"><span className="rl-chip" style={{ alignSelf: "flex-start" }}>Coming</span><span className="t">Apple Watch</span><span className="s">Apple doesn&rsquo;t take workout files directly, so this needs a companion app. On the list, not in the box yet.</span></div>
          </div>
          <Ink name="intervals" style={{ width: "min(100%, 640px)", opacity: 0.8 }} />
        </div>
      </section>

      {/* ---------- creators cross-link ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-band" data-reveal>
          <div className="rl-stack" style={{ gap: 2 }}>
            <span className="t-label c-muted">Coach a following?</span>
            <span className="t-title">Your followers can follow the plan. You keep 80 percent.</span>
          </div>
          <Link href="/creators" className="rl-btn rl-btn-secondary">For creators →</Link>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="rl-atmo rl-atmo-night" style={{ padding: "var(--rl-space-16) 0" }}>
        <div className="rl-page rl-wide rl-stack" style={{ paddingBlock: 0, gap: "var(--rl-space-5)", alignItems: "flex-start" }} data-reveal>
          <Flipbook tone="paper" width={150} />
          <h2 className="t-display-xl" style={{ margin: 0, maxWidth: "14ch" }}>Your first week is waiting.</h2>
          <div className="rl-row">
            <Link href="/signup" className="rl-btn rl-btn-lg rl-btn-paper">Create an account</Link>
            <Link href="/signup?as=creator" className="rl-btn rl-btn-lg rl-btn-secondary">I&rsquo;m here to create</Link>
          </div>
        </div>
      </section>

      <footer className="rl-page rl-wide rl-between" style={{ paddingBlock: "var(--rl-space-6)" }}>
        <span className="rl-help">RunLetter</span>
        <span className="rl-help">Subscriptions sold on the web. Nothing to buy in the app.</span>
      </footer>
    </main>
  );
}
