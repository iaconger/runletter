// One run, all of it. Photo, the type's colour, the creator's note, every step in your own paces, what the
// watch will show, and one tap to send it. Works for a sample run (key) or any program day (uuid) you may see.
import Link from "next/link";
import { notFound } from "next/navigation";
import { RunCard } from "@/components/run/RunCard";
import { StepCards } from "@/components/run/StepCards";
import { dayTitle } from "@/components/run/RunPieces";
import { getMyProfile, getMyWeek, getRunDay } from "@/lib/db/programs";
import { watchPreview } from "@/lib/fit/encode";
import { SAMPLE_EXPLORE, sampleExploreByKey, type ExploreRun } from "@/lib/explore";
import { isConfigured } from "@/lib/supabase/server";
import { RUN_TYPE_LABEL, dayDurationS, toISODate } from "@/lib/types";
import { markDoneAction } from "../../actions";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string): Promise<{ r: ExploreRun; more: ExploreRun[]; enrolled: { enrollmentId: string; done: boolean } | null } | null> {
  const sample = sampleExploreByKey(id);
  if (sample) return { r: sample, more: SAMPLE_EXPLORE.filter((x) => x.key !== id).slice(0, 3), enrolled: null };
  if (!UUID.test(id) || !isConfigured()) return null;
  const hit = await getRunDay(id);
  if (!hit || hit.day.kind !== "run") return null;
  const { program, day, creator } = hit;
  const r: ExploreRun = {
    key: day.id, title: dayTitle(day), day, programId: program.id, programTitle: program.title,
    creator: { name: creator.displayName, handle: creator.handle, avatarUrl: creator.avatarUrl },
    cover: program.coverUrl ?? undefined,
    fitHref: `/api/fit?program=${program.id}&week=${day.week}&day=${day.day}`,
  };
  const more = program.days
    .filter((d) => d.kind === "run" && d.id !== day.id && d.week === day.week)
    .map<ExploreRun>((d) => ({ key: d.id, title: dayTitle(d), day: d, programId: program.id, programTitle: program.title, creator: r.creator, cover: r.cover, fitHref: `/api/fit?program=${program.id}&week=${d.week}&day=${d.day}` }));
  const mine = await getMyWeek(toISODate(new Date()));
  const enrolled = mine && mine.program.id === program.id ? { enrollmentId: mine.enrollmentId, done: mine.week === day.week && mine.done.has(day.day) } : null;
  return { r, more, enrolled };
}

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hit = await load(id);
  if (!hit) notFound();
  const { r, more, enrolled } = hit;
  const me = isConfigured() ? await getMyProfile() : null;
  const day = r.day;
  const type = day.runType ? RUN_TYPE_LABEL[day.runType] : "Run";
  const mins = Math.round(dayDurationS(day) / 60);
  const work = day.blocks.filter((b) => b.kind === "work");
  const reps = work.reduce((n, b) => n + (b.repeatCount ?? 1), 0);
  const hard = work.filter((b) => b.targetEffort === "hard").reduce((s, b) => s + (b.durationS ?? 0) * (b.repeatCount ?? 1), 0);
  const steps = watchPreview(day, me?.pace5kS, me?.units ?? "km");
  const photo = r.creator.avatarUrl ?? (r.creator.portrait ? `/brand/photo/${r.creator.portrait}.webp` : null);
  const cover = r.cover ?? photo;

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <Link href="/app" className="rl-help" style={{ alignSelf: "flex-start" }}>← Today</Link>

      <article className="rl-rundetail" data-run={day.runType ?? "easy"}>
        <div className="img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover && <img src={cover} alt="" />}
          <span className="band">{type} · {mins} min</span>
        </div>
        <div className="top">
          <h1>{r.title}</h1>
          <Link href={`/c/${r.creator.handle}`} className="who">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo && <img src={photo} alt="" />}
            {r.creator.name}{r.programTitle ? ` · ${r.programTitle}` : ""}
          </Link>
        </div>
        <div className="body">
          {day.note && <blockquote className="rl-note" style={{ margin: 0 }}><q>{day.note}</q></blockquote>}

          <div className="rl-stats">
            <div><span className="n">{mins}</span><span className="l">min</span></div>
            <div><span className="n">{steps.length}</span><span className="l">steps</span></div>
            {reps > 1 && <div><span className="n">{reps}</span><span className="l">reps</span></div>}
            {hard > 0 && <div><span className="n">{Math.round(hard / 60)}</span><span className="l">min hard</span></div>}
          </div>

          <div className="rl-row">
            <a className="rl-btn rl-btn-primary rl-btn-lg" href={r.fitHref} download>Send to watch</a>
            {enrolled && !enrolled.done && (
              <form action={markDoneAction}>
                <input type="hidden" name="enrollmentId" value={enrolled.enrollmentId} />
                <input type="hidden" name="programDayId" value={day.id} />
                <button className="rl-btn rl-btn-ghost rl-btn-lg" type="submit">Mark done</button>
              </form>
            )}
            {enrolled?.done && <span className="rl-chip rl-chip-success" style={{ alignSelf: "center" }}>Done</span>}
            {r.completions ? <span className="rl-chip" style={{ alignSelf: "center" }}>{r.completions} ran it</span> : null}
          </div>
        </div>
      </article>

      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
        <h2 className="t-title" style={{ margin: 0 }}>The run</h2>
        <StepCards day={day} pace5kS={me?.pace5kS} units={me?.units ?? "km"} />
        {me && !me.pace5kS && <span className="rl-help"><Link href="/app/you">Add your 5K time</Link> for your own paces.</span>}
      </section>

      <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
        <h2 className="t-title" style={{ margin: 0 }}>On your watch</h2>
        <div className="rl-watch">
          <ol>
            {steps.map((st, i) => (
              <li key={i} data-kind={st.kind}>
                <span className="nm">{st.name}</span>
                <span className="am">{st.amount}</span>
                <span className="tg">{st.target}</span>
              </li>
            ))}
          </ol>
          <span className="rl-help">Garmin and COROS run the steps and buzz on each change. Strava marks it done when you finish.</span>
        </div>
      </section>

      {more.length > 0 && (
        <section className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <h2 className="t-title" style={{ margin: 0 }}>{r.programId ? "Same week" : "More to try"}</h2>
          <div className="rl-rail">{more.map((x) => <RunCard key={x.key} r={x} compact />)}</div>
        </section>
      )}
    </main>
  );
}
