// Landing. Vibe: "Kitchen Table, Sunday Night". Hand-inked training journal meets railway timetable.
// Kept deliberately short: hero, how it works, the day itself, who writes them, where it runs, price, CTA.
// Every claim gets one sentence. If a section needs a paragraph to land, it is the wrong section.

import Link from "next/link";
import { Lockup } from "@/components/ui/Logo";
import { HeaderTone } from "@/components/ui/HeaderTone";
import { Ink } from "@/components/ui/Ink";
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
            <Lockup height={22} />
          </Link>
          <nav className="rl-row">
            <Link href="/demo" className="rl-btn rl-btn-ghost rl-btn-sm rl-nav-secondary">See it working</Link>
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
            <p className="t-label rl-kicker rl-rise" style={{ opacity: 0.75, margin: 0 }}>This week, from runners you follow</p>
            <h1 className="t-display-hero rl-rise" style={{ maxWidth: "12ch", margin: 0, ["--rise-delay" as string]: "80ms" }}>
              Run what they&rsquo;re running.
            </h1>
            <p className="t-title rl-rise" style={{ margin: 0, maxWidth: "28ch", ["--rise-delay" as string]: "160ms" }}>
              A real runner&rsquo;s week, on your watch every Monday.
            </p>
            <div className="rl-row rl-rise" style={{ alignItems: "center", gap: "var(--rl-space-5)", ["--rise-delay" as string]: "320ms" }}>
              <Link href="/signup" className="rl-btn rl-btn-lg rl-btn-paper rl-btn-shine">
                Start free &rarr;
              </Link>
              <Link href="/demo" className="rl-textlink" style={{ color: "inherit", opacity: 0.8 }}>
                See it working &rarr;
              </Link>
            </div>
            <div className="rl-works rl-rise" style={{ ["--rise-delay" as string]: "400ms" }} aria-label="Works with">
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
          <p className="t-label" style={{ opacity: 0.6, margin: "0 0 var(--rl-space-2)" }}>One creator&rsquo;s week</p>
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
            <div className="rl-step-head"><span className="n">01</span></div>
            <h3 className="t-heading" style={{ margin: 0 }}>They write the week</h3>
            <p className="c-secondary" style={{ margin: 0 }}>Seven days, in their own words, published Sunday night.</p>
          </div>
          <div className="rl-step" data-reveal style={delay(120)}>
            <div className="rl-step-head"><span className="n">02</span></div>
            <h3 className="t-heading" style={{ margin: 0 }}>It lands before you need it</h3>
            <p className="c-secondary" style={{ margin: 0 }}>Follow them and the whole week is there on Monday morning.</p>
          </div>
          <div className="rl-step" data-reveal style={delay(240)}>
            <div className="rl-step-head"><span className="n">03</span></div>
            <h3 className="t-heading" style={{ margin: 0 }}>Send it to your watch</h3>
            <p className="c-secondary" style={{ margin: 0 }}>One tap, then run. Strava ticks the day off for you.</p>
          </div>
        </div>
      </section>

      {/* ---------- one day, and the two things that make it different ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide" style={{ display: "grid", gap: "var(--rl-space-8)", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "center", paddingBlock: "var(--rl-space-12)" }}>
          <div className="rl-card" data-reveal>
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
          <div className="rl-stack" style={{ gap: "var(--rl-space-6)", ...delay(120) }} data-reveal>
            <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
              <h2 className="t-display-lg" style={{ margin: 0 }}>You don&rsquo;t need a race.</h2>
              <p className="t-body c-secondary" style={{ margin: 0, maxWidth: "40ch" }}>
                Most weeks here aren&rsquo;t building to anything. Follow the person, not the goal.
              </p>
            </div>
            <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
              <h2 className="t-display-lg" style={{ margin: 0 }}>No AI writes the running.</h2>
              <p className="t-body c-secondary" style={{ margin: 0, maxWidth: "40ch" }}>
                If it says Sarah, Sarah wrote it. We deliver the week; we never generate it.
              </p>
            </div>
          </div>
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
            <Link href="/demo" className="rl-btn rl-btn-ghost">See it working →</Link>
          </div>
          <CreatorRow />
        </div>
      </section>

      {/* ---------- price ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-5)", paddingBlock: "var(--rl-space-12)", alignItems: "flex-start" }} data-reveal>
          <span className="t-label c-muted">What it costs</span>
          <h2 className="t-display-lg" style={{ margin: 0, maxWidth: "20ch" }}>Free to use. You pay the runner, not us.</h2>
          <div className="rl-pricerow">
            <div>
              <span className="rl-price rl-price-free rl-price-lg">Free</span>
              <span className="l">The app, your watch export, your own running.</span>
            </div>
            <div>
              <span className="rl-price rl-price-lg">$4&ndash;$9<span className="per">/mo</span></span>
              <span className="l">A creator&rsquo;s week. They set the price, they keep 80 percent.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- devices ---------- */}
      <section className="rl-hairline">
        <div className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)", paddingBlock: "var(--rl-space-12)" }} data-reveal>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)", maxWidth: "44ch" }}>
            <span className="t-label c-muted">Runs where you already run</span>
            <h2 className="t-display-lg" style={{ margin: 0 }}>Your watch does the coaching.</h2>
          </div>
          <div className="rl-devices">
            <div className="rl-device"><span className="rl-chip rl-chip-success" style={{ alignSelf: "flex-start" }}>Now</span><span className="t">Garmin</span><span className="s">The intervals go on the watch and it beeps you through them.</span></div>
            <div className="rl-device"><span className="rl-chip rl-chip-success" style={{ alignSelf: "flex-start" }}>Now</span><span className="t">Coros</span><span className="s">Same file, same pace targets.</span></div>
            <div className="rl-device"><span className="rl-chip rl-chip-success" style={{ alignSelf: "flex-start" }}>Now</span><span className="t rl-row" style={{ gap: 8, alignItems: "center" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/partners/strava-96.png" alt="" width={22} height={22} style={{ borderRadius: 5 }} />Strava</span><span className="s">Connect once and every day marks itself done.</span></div>
            <div className="rl-device"><span className="rl-chip" style={{ alignSelf: "flex-start" }}>Coming</span><span className="t">Apple Watch</span><span className="s">Needs a companion app. On the list.</span></div>
          </div>
          <Ink name="intervals" style={{ width: "min(100%, 640px)", opacity: 0.8 }} />
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="rl-atmo rl-atmo-night" style={{ padding: "var(--rl-space-16) 0" }}>
        <div className="rl-page rl-wide rl-stack" style={{ paddingBlock: 0, gap: "var(--rl-space-5)", alignItems: "flex-start" }} data-reveal>
          <Flipbook tone="paper" width={150} />
          <h2 className="t-display-xl" style={{ margin: 0, maxWidth: "14ch" }}>Your first week is waiting.</h2>
          <div className="rl-row">
            <Link href="/signup" className="rl-btn rl-btn-lg rl-btn-paper">Create an account</Link>
            <Link href="/creators" className="rl-btn rl-btn-lg rl-btn-secondary">I&rsquo;m here to create</Link>
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
