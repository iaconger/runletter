// Studio home. Your week, live as you write it, plus plans (fixed length, bought once).
import Link from "next/link";
import { getMyProfile, listMyPrograms, listExtras } from "@/lib/db/programs";
import { shareRunAction } from "@/app/studio/actions";
import { RouteSketch } from "@/components/run/RouteSketch";
import { climbLabel, distanceLabel, fmtClimb, fmtDistance, fmtPace, paceLabel } from "@/lib/units";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/types";
import { isConfigured } from "@/lib/supabase/server";
import { Cover, coverFor } from "@/components/ui/Ink";
import { ProgramCover } from "@/components/run/ProgramCover";
import { startLetterAction } from "@/app/studio/actions";
import { sampleProgram } from "@/lib/sample";
import { Goal, Level, addDays, weekOfDate, type Program } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<Program["status"], string> = { draft: "rl-chip", published: "rl-chip rl-chip-success", archived: "rl-chip" };
const GOAL_LABEL: Record<string, string> = { base: "Base building", "5k": "5K", "10k": "10K", half: "Half marathon", marathon: "Marathon", other: "Just running" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

export default async function StudioHome({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const configured = isConfigured();
  const [profile, programs] = configured ? await Promise.all([getMyProfile(), listMyPrograms()]) : [null, []];
  const needsHandle = profile && profile.handle.startsWith("u_");
  const letter = programs.find((p) => p.isLetter) ?? null;
  const plans = programs.filter((p) => !p.isLetter);
  const today = new Date();
  const thisWeek = letter?.fixedStartDate ? weekOfDate(letter.fixedStartDate, today, letter.weeks) : null;
  const thisWeekDays = letter && thisWeek ? letter.days.filter((d) => d.week === thisWeek).length : 0;
  const firstName = profile?.displayName?.split(" ")[0];
  // The creator's own running, from Strava: the raw material for the week.
  const todayIso = toISODate(today);
  const myRuns = profile ? (await listExtras(profile.id, toISODate(addDays(todayIso, -14)), todayIso)).filter((x) => ["Run", "TrailRun", "VirtualRun"].includes(x.sportType)).reverse() : [];
  const supabase = configured ? await createClient() : null;
  const { data: conns } = profile && supabase ? await supabase.from("connections").select("provider").eq("user_id", profile.id).eq("provider", "strava") : { data: [] };
  const hasStrava = (conns ?? []).length > 0;
  const sharedIds = new Set(letter ? letter.days.map((d) => d.note) : []);
  const units = profile?.units ?? "km";

  return (
    <main className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-7, 40px)" }}>
      <div className="rl-between" style={{ alignItems: "center", flexWrap: "wrap", gap: "var(--rl-space-4)" }}>
        <div className="rl-row" style={{ alignItems: "center", gap: "var(--rl-space-4)" }}>
          <span className="rl-avatar" style={{ width: 64, height: 64 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span style={{ display: "grid", placeItems: "center", height: "100%", font: "var(--rl-text-title)", color: "var(--rl-text-muted)" }}>{(firstName ?? "R")[0]}</span>}
          </span>
          <div className="rl-stack" style={{ gap: 2 }}>
            <span className="t-label c-muted">{profile ? `@${profile.handle}` : "Studio"}</span>
            <h1 className="t-display-lg" style={{ margin: 0 }}>{firstName ? `Morning, ${firstName}.` : "Studio"}</h1>
          </div>
        </div>
        {profile && !needsHandle && (
          <Link href={`/c/${profile.handle}`} className="rl-btn rl-btn-ghost rl-btn-sm">runletter.com/c/{profile.handle} →</Link>
        )}
      </div>

      {kind === "creator" && (
        <div className="rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "10px 14px" }}>
          <span className="t-body-sm">This is a creator account. To follow someone&rsquo;s runs yourself, <Link href="/signup?as=runner">make a runner account</Link> with another email.</span>
        </div>
      )}
      {needsHandle && (
        <div className="rl-card" style={{ borderColor: "var(--rl-accent)", gap: "var(--rl-space-2)" }}>
          <span className="t-heading">Pick your handle first</span>
          <span className="c-secondary">runletter.com/c/<b>yourhandle</b></span>
          <Link href="/studio/page" className="rl-btn rl-btn-secondary" style={{ alignSelf: "flex-start" }}>Set up your page</Link>
        </div>
      )}

      {/* ---------- your week ---------- */}
      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }} aria-label="Your week">
        <div className="rl-between" style={{ alignItems: "baseline" }}>
          <div className="rl-stack" style={{ gap: 2 }}>
            <span className="t-label c-muted">Your week</span>
            <h2 className="t-title" style={{ margin: 0 }}>{letter ? letter.title : "Open your week"}</h2>
          </div>
          {letter && <Link href={`/studio/programs/${letter.id}`} className="rl-btn rl-btn-primary rl-btn-sm">Open this week</Link>}
        </div>

        {letter ? (
          <Link href={`/studio/programs/${letter.id}`} className="rl-lettercard" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {letter.coverUrl ? <img src={letter.coverUrl} alt="" /> : <Cover name={coverFor(letter)} ratio={5 / 4} />}
            </div>
            <div className="rl-stack" style={{ padding: "var(--rl-space-4)", gap: "var(--rl-space-3)" }}>
              <div className="rl-between">
                <span className="t-heading">{thisWeek ? `Week ${thisWeek}` : "Not started"}{letter.fixedStartDate && thisWeek ? ` · ${fmtDate(addDays(letter.fixedStartDate, (thisWeek - 1) * 7))} to ${fmtDate(addDays(letter.fixedStartDate, (thisWeek - 1) * 7 + 6))}` : ""}</span>
                <span className={STATUS_CHIP[letter.status]}>{letter.status === "published" ? "Open" : letter.status}</span>
              </div>
              <span className="c-secondary">
                {thisWeekDays === 0 ? "Nothing in it yet." : thisWeekDays < 7 ? `${thisWeekDays} of 7 days written.` : "All seven days written."}
              </span>
              <span className="rl-help">Your followers see it as you write it. Nothing to send.</span>
            </div>
          </Link>
        ) : (
          <form action={startLetterAction} className="rl-lettercard">
            <div className="img"><Cover name="dawn-road" ratio={5 / 4} /></div>
            <div className="rl-stack" style={{ padding: "var(--rl-space-4)", gap: "var(--rl-space-3)" }}>
              <span className="c-secondary">The runs you are doing, posted as a week. Followers see the shape of it; subscribers get it on their watch.</span>
              <div className="rl-row" style={{ alignItems: "stretch" }}>
                <div className="rl-field" style={{ flex: 2, minWidth: 200 }}>
                  <label htmlFor="ltitle">Call it</label>
                  <input id="ltitle" name="title" className="rl-input" placeholder={firstName ? `${firstName}'s week` : "My week"} maxLength={80} />
                </div>
                <div className="rl-field" style={{ flex: 1, minWidth: 140 }}>
                  <label htmlFor="lgoal">Mostly for</label>
                  <select id="lgoal" name="goal" className="rl-input" defaultValue="other">
                    {Goal.options.map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
                  </select>
                </div>
                <div className="rl-field" style={{ flex: 1, minWidth: 140 }}>
                  <label htmlFor="llevel">Level</label>
                  <select id="llevel" name="level" className="rl-input" defaultValue="intermediate">
                    {Level.options.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="rl-btn rl-btn-primary" style={{ alignSelf: "flex-start" }} disabled={!configured}>Open my week →</button>
            </div>
          </form>
        )}
      </section>

      {/* ---------- your runs, from Strava: share one into the week ---------- */}
      {profile && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }} aria-label="Your runs">
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <div className="rl-stack" style={{ gap: 2 }}>
              <span className="t-label c-muted">From your Strava</span>
              <h2 className="t-title" style={{ margin: 0 }}>Runs you could share</h2>
            </div>
            <Link href="/studio/page#connections" className="rl-help">{hasStrava ? "Sync →" : "Connect Strava →"}</Link>
          </div>
          {!hasStrava ? (
            <div className="rl-connect-prompt">
              <span className="t-body-sm">Connect Strava and your runs show up here, ready to share into your week.</span>
              <Link href="/studio/page#connections" className="rl-btn rl-btn-primary rl-btn-sm">Connect</Link>
            </div>
          ) : myRuns.length === 0 ? (
            <span className="rl-help">Nothing in the last two weeks. Go run, then come back.</span>
          ) : (
            <ul className="rl-sharelist">
              {myRuns.slice(0, 6).map((x) => (
                <li key={x.id}>
                  {x.polyline ? <RouteSketch polyline={x.polyline} size={56} /> : <span className="rl-avatar" style={{ width: 56, height: 56 }} />}
                  <div className="rl-stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="t-body-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name ?? "Run"}</span>
                    <span className="rl-help">{fmtDate(addDays(x.date, 0))}{x.distanceM ? ` · ${fmtDistance(x.distanceM, units)} ${distanceLabel(units)}` : ""}{x.durationS ? ` · ${Math.round(x.durationS / 60)} min` : ""}{x.avgPaceS ? ` · ${fmtPace(x.avgPaceS, units)} ${paceLabel(units)}` : ""}{x.elevationM ? ` · ${fmtClimb(x.elevationM, units)} ${climbLabel(units)}` : ""}</span>
                  </div>
                  {letter ? (
                    sharedIds.has(x.name ?? "") ? <span className="rl-chip rl-chip-success">Shared</span> : (
                      <form action={shareRunAction} className="rl-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <input type="hidden" name="extraId" value={x.id} />
                        <input name="note" className="rl-input" placeholder="Why this run" maxLength={400} style={{ height: 34, minWidth: 0, width: 180 }} />
                        <button type="submit" className="rl-btn rl-btn-primary rl-btn-sm">Share →</button>
                      </form>
                    )
                  ) : <span className="rl-help">Open your week first</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---------- plans ---------- */}
      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }} aria-label="Plans">
        <div className="rl-between" style={{ alignItems: "baseline" }}>
          <div className="rl-stack" style={{ gap: 2 }}>
            <h2 className="t-title" style={{ margin: 0 }}>Plans</h2>
          </div>
          <Link href="/studio/new" className="rl-btn rl-btn-secondary rl-btn-sm">New plan</Link>
        </div>
        {plans.length === 0 ? (
          <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
            <span className="c-secondary">Fixed length, bought once. Here is an example.</span>
            <PlanCard p={sampleProgram} href={`/studio/programs/${sampleProgram.id}`} example />
          </div>
        ) : (
          <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
            {plans.map((p) => <PlanCard key={p.id} p={p} href={`/studio/programs/${p.id}`} />)}
          </div>
        )}
      </section>
    </main>
  );
}

function PlanCard({ p, href, example = false }: { p: Program; href: string; example?: boolean }) {
  const runs = p.days.filter((d) => d.kind === "run").length;
  return (
    <Link href={href} className="rl-card" style={{ color: "inherit", textDecoration: "none" }}>
      <div className="rl-cover-row">
        <ProgramCover p={p} ratio={4 / 3} />
        <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between">
            <span className="t-heading">{p.title}</span>
            <span className={STATUS_CHIP[p.status]}>{example ? "Example" : p.status}</span>
          </div>
          {p.description && <span className="c-secondary">{p.description}</span>}
          <span className="rl-row">
            <span className="rl-chip">{p.weeks} weeks</span>
            {runs > 0 && <span className="rl-chip">{runs} runs</span>}
            <span className="rl-chip">{p.level}</span>
            <span className="rl-chip">{GOAL_LABEL[p.goal]}</span>
            <span className="rl-chip">{p.access === "creator_sub" ? "Included for subscribers" : `$${((p.priceCents ?? 0) / 100).toFixed(0)} one-time`}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
