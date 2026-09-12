// Studio home. Two things a creator makes: the Letter (one, ongoing, subscription) and Plans (many, fixed, bought once).
import Link from "next/link";
import { getMyProfile, listMyPrograms, listIssues } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { Cover, coverFor } from "@/components/ui/Ink";
import { startLetterAction } from "@/app/studio/actions";
import { sampleProgram } from "@/lib/sample";
import { Goal, Level, addDays, toISODate, weekOfDate, type Program } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<Program["status"], string> = { draft: "rl-chip", published: "rl-chip rl-chip-success", archived: "rl-chip" };
const GOAL_LABEL: Record<string, string> = { base: "Base building", "5k": "5K", "10k": "10K", half: "Half marathon", marathon: "Marathon", other: "Something else" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

export default async function StudioHome() {
  const configured = isConfigured();
  const [profile, programs] = configured ? await Promise.all([getMyProfile(), listMyPrograms()]) : [null, []];
  const needsHandle = profile && profile.handle.startsWith("u_");
  const letter = programs.find((p) => p.isLetter) ?? null;
  const plans = programs.filter((p) => !p.isLetter);
  const issues = letter ? await listIssues(letter.id) : [];
  const today = new Date();
  const thisWeek = letter?.fixedStartDate ? weekOfDate(letter.fixedStartDate, today, letter.weeks) : null;
  const thisIssue = thisWeek ? issues.find((i) => i.week === thisWeek) : undefined;
  const thisWeekDays = letter && thisWeek ? letter.days.filter((d) => d.week === thisWeek).length : 0;
  const sent = issues.filter((i) => i.sentAt).length;
  const firstName = profile?.displayName?.split(" ")[0];

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

      {needsHandle && (
        <div className="rl-card" style={{ borderColor: "var(--rl-accent)", gap: "var(--rl-space-2)" }}>
          <span className="t-heading">Pick your handle first</span>
          <span className="c-secondary">Your page will live at runletter.com/c/<b>yourhandle</b>. Set it, your name and a line about you before you open anything.</span>
          <Link href="/studio/page" className="rl-btn rl-btn-secondary" style={{ alignSelf: "flex-start" }}>Set up your page</Link>
        </div>
      )}

      {/* ---------- the Letter ---------- */}
      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }} aria-label="Your Letter">
        <div className="rl-between" style={{ alignItems: "baseline" }}>
          <div className="rl-stack" style={{ gap: 2 }}>
            <span className="t-label c-muted">Your Letter</span>
            <h2 className="t-title" style={{ margin: 0 }}>{letter ? letter.title : "One plan, every week, to everyone who subscribes."}</h2>
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
                {thisIssue?.sentAt ? "This week is sent. Start on next week whenever you like." : thisWeekDays === 0 ? "This week is empty. Fill seven days and send it." : thisWeekDays < 7 ? `${thisWeekDays} of 7 days filled. Finish the week and send it.` : "Seven days ready. Write a line about the week and send it."}
              </span>
              <div className="rl-row">
                <span className="rl-stamp" data-state={thisIssue?.sentAt ? "sent" : thisIssue?.scheduledFor ? "scheduled" : "draft"}>{thisIssue?.sentAt ? "sent" : thisIssue?.scheduledFor ? "scheduled" : "this week: draft"}</span>
                <span className="rl-chip">{sent} week{sent === 1 ? "" : "s"} sent</span>
                <span className="rl-chip">{letter.access === "creator_sub" ? "Subscription" : "Free"}</span>
              </div>
            </div>
          </Link>
        ) : (
          <form action={startLetterAction} className="rl-lettercard">
            <div className="img"><Cover name="dawn-road" ratio={5 / 4} /></div>
            <div className="rl-stack" style={{ padding: "var(--rl-space-4)", gap: "var(--rl-space-3)" }}>
              <span className="c-secondary">Your Letter is the subscription. Each week you plan seven days, write a few lines about them, and send. It lands in their app Sunday night, on their watch Monday morning. Plans are the one-off products; the Letter is the relationship.</span>
              <div className="rl-row" style={{ alignItems: "stretch" }}>
                <div className="rl-field" style={{ flex: 2, minWidth: 200 }}>
                  <label htmlFor="ltitle">Call it</label>
                  <input id="ltitle" name="title" className="rl-input" placeholder={firstName ? `${firstName}'s Letter` : "My Letter"} maxLength={80} />
                </div>
                <div className="rl-field" style={{ flex: 1, minWidth: 140 }}>
                  <label htmlFor="lgoal">Mostly for</label>
                  <select id="lgoal" name="goal" className="rl-input" defaultValue="base">
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
              <button type="submit" className="rl-btn rl-btn-primary" style={{ alignSelf: "flex-start" }} disabled={!configured}>Start my Letter (week of {fmtDate(addDays(toISODate(today), -((today.getDay() + 6) % 7)))})</button>
            </div>
          </form>
        )}
      </section>

      {/* ---------- plans ---------- */}
      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }} aria-label="Plans">
        <div className="rl-between" style={{ alignItems: "baseline" }}>
          <div className="rl-stack" style={{ gap: 2 }}>
            <span className="t-label c-muted">Plans</span>
            <h2 className="t-title" style={{ margin: 0 }}>Turn your running programs into products.</h2>
          </div>
          <Link href="/studio/new" className="rl-btn rl-btn-secondary rl-btn-sm">New plan</Link>
        </div>
        {plans.length === 0 ? (
          <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
            <span className="c-secondary">A plan is fixed: twelve weeks to a sub-20 5K, eight weeks back from injury. Runners buy it once and start the Monday after. Below is what a finished one looks like.</span>
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
        {p.coverUrl ? (
          <span style={{ display: "block", aspectRatio: "4 / 3", borderRadius: "var(--rl-radius-md)", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </span>
        ) : (
          <Cover name={coverFor(p)} ratio={4 / 3} />
        )}
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
