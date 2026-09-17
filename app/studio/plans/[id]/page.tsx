// Building a plan: the same week builder, week by week, for as many weeks as the plan has. Plus the two
// things a plan needs that a week does not: a price, and a switch to put it on your page.
import Link from "next/link";
import { notFound } from "next/navigation";
import { WeekBuilder } from "@/components/studio/WeekBuilder";
import { getMyProfile, getProgram } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { addDays, dayDurationS, toISODate } from "@/lib/types";
import { addPlanWeekAction, clearDayAction, noteDayAction, repeatWeekAction, savePlanAction, saveDaySpecAction, setShapeAction, stretchDayAction, togglePlanAction, useMyRunAction } from "@/app/studio/actions";

export const metadata = { title: "Plan" };
export const dynamic = "force-dynamic";

export default async function PlanBuilder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ w?: string }> }) {
  const { id } = await params;
  const { w } = await searchParams;
  const [me, program] = isConfigured() ? await Promise.all([getMyProfile(), getProgram(id)]) : [null, null];
  if (!me || !program || program.isLetter || program.creatorId !== me.id) notFound();

  const week = Math.min(program.weeks, Math.max(1, Number(w) || 1));
  const days = program.days.filter((d) => d.week === week).sort((a, b) => a.day - b.day);
  // A plan has no dates: someone runs it from whenever they start. Day one is just day one.
  const dates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(toISODate(new Date()), i)));
  const written = program.days.length;
  const runs = program.days.filter((d) => d.kind === "run").length;
  const hours = Math.round(program.days.reduce((a, d) => a + dayDurationS(d), 0) / 360) / 10;
  const empty = Array.from({ length: program.weeks }, (_, i) => i + 1).filter((n) => !program.days.some((d) => d.week === n));

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(820px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
      <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
        <div className="rl-stack" style={{ gap: 2 }}>
          <Link href="/studio/plans" className="rl-help">← Plans</Link>
          <h1 className="t-display-lg" style={{ margin: 0 }}>{program.title}</h1>
          <span className="rl-help">{program.weeks} weeks · {runs} runs{hours ? ` · ${hours}h` : ""}{written === 0 ? " · nothing written yet" : ""}</span>
        </div>
        <form action={togglePlanAction}>
          <input type="hidden" name="id" value={program.id} />
          <button type="submit" className={`rl-btn rl-btn-sm ${program.status === "published" ? "rl-btn-ghost" : "rl-btn-primary"}`}>
            {program.status === "published" ? "Take off my page" : "Put it on my page"}
          </button>
        </form>
      </div>

      <form action={savePlanAction} className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
        <input type="hidden" name="id" value={program.id} />
        <div className="rl-row" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
          <div className="rl-field" style={{ flex: 2, minWidth: 220 }}>
            <label htmlFor="title">Name</label>
            <input id="title" name="title" className="rl-input" defaultValue={program.title} maxLength={80} />
          </div>
          <div className="rl-field" style={{ flex: 1, minWidth: 120 }}>
            <label htmlFor="price">Price</label>
            <input id="price" name="price" type="number" className="rl-input" min={0} step={1} defaultValue={((program.priceCents ?? 0) / 100).toFixed(0)} />
            <span className="rl-help">Once, not monthly. 0 is free.</span>
          </div>
          <button type="submit" className="rl-btn rl-btn-secondary" style={{ alignSelf: "flex-end" }}>Save</button>
        </div>
      </form>

      <nav className="rl-weekrail" aria-label="Weeks of this plan">
        {Array.from({ length: program.weeks }, (_, i) => {
          const n = i + 1;
          const ds = program.days.filter((d) => d.week === n);
          const r = ds.filter((d) => d.kind === "run");
          const mins = Math.round(r.reduce((a, d) => a + dayDurationS(d), 0) / 60);
          return (
            <Link key={n} href={`/studio/plans/${program.id}?w=${n}`} data-on={n === week ? "true" : undefined} data-empty={ds.length === 0 ? "true" : undefined}>
              <span className="wk">Week {n}</span>
              <span className="dt">{n === 1 ? "start" : n === program.weeks ? "last" : ""}</span>
              <span className="fill" aria-hidden>
                {Array.from({ length: 7 }, (_, d) => {
                  const day = ds.find((x) => x.day === d + 1) ?? null;
                  return <i key={d} data-run={day ? (day.kind === "run" ? day.runType ?? "easy" : day.kind) : undefined} />;
                })}
              </span>
              <span className="sum">{ds.length === 0 ? "empty" : `${r.length} run${r.length === 1 ? "" : "s"}${mins ? ` · ${mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}` : `${mins}m`}` : ""}`}</span>
            </Link>
          );
        })}
        <form action={addPlanWeekAction} style={{ flex: "0 0 auto", alignSelf: "stretch", display: "flex" }}>
          <input type="hidden" name="id" value={program.id} />
          <button type="submit" className="rl-btn rl-btn-ghost rl-btn-sm" style={{ height: "100%" }}>+ Week</button>
        </form>
      </nav>

      <div className="rl-stack" style={{ gap: 2 }}>
        <h2 className="t-title" style={{ margin: 0 }}>Week {week}</h2>
        <span className="rl-help">Day one is whenever someone starts, so these are days, not dates.</span>
      </div>

      <WeekBuilder
        programId={program.id}
        week={week}
        days={days}
        myRuns={[]}
        dates={dates}
        units={me.units}
        canRepeat={week > 1}
        actions={{
          setShape: setShapeAction,
          stretch: stretchDayAction,
          note: noteDayAction,
          useMyRun: useMyRunAction,
          saveSpec: saveDaySpecAction,
          clearDay: clearDayAction,
          repeatWeek: repeatWeekAction,
        }}
      />

      {program.status === "published" && empty.length > 0 && (
        <span className="rl-help" role="alert">
          {empty.length === 1 ? `Week ${empty[0]} is` : `Weeks ${empty.slice(0, 4).join(", ")}${empty.length > 4 ? " and more" : ""} are`} still empty, and this plan is on your page.
        </span>
      )}
    </main>
  );
}
