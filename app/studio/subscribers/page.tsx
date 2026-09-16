// Runners, as a board. Who ran what this week, who is on a streak, who moved. The creator's people are the
// point of the product, so this screen should feel like a wall chart, not a CRM.
import { Ink } from "@/components/ui/Ink";
import { listMyRunners, getMyProfile } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { toISODate } from "@/lib/types";
import { distanceLabel, fmtDistance, toDistance } from "@/lib/units";

export const metadata = { title: "Runners" };
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const MEDAL = ["1st", "2nd", "3rd"];

export default async function Runners() {
  const today = toISODate(new Date());
  const [me, rows] = isConfigured() ? await Promise.all([getMyProfile(), listMyRunners(today)]) : [null, []];
  const units = me?.units ?? "km";
  const U = distanceLabel(units);
  const board = [...rows].sort((a, b) => b.weekM - a.weekM || b.done - a.done);

  const crewM = rows.reduce((a, r) => a + r.weekM, 0);
  const crewRuns = rows.reduce((a, r) => a + r.ranDays.length, 0);
  const best = board[0] ?? null;
  const longest = rows.reduce((m, r) => (r.longestM > (m?.longestM ?? 0) ? r : m), null as (typeof rows)[number] | null);
  const onStreak = rows.filter((r) => r.streak >= 2).length;
  const top = Math.max(1, ...board.map((r) => r.weekM));

  return (
    <main className="rl-page rl-wide rl-stack" style={{ maxWidth: "calc(1000px + 2 * var(--rl-gutter))", gap: "var(--rl-space-5)" }}>
      <div className="rl-stack" style={{ gap: 2 }}>
        <span className="t-label c-muted rl-kicker">This week</span>
        <h1 className="t-display-lg" style={{ margin: 0 }}>Your runners</h1>
      </div>

      {rows.length === 0 ? (
        <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-3)", alignItems: "flex-start" }}>
          <Ink name="sequence" style={{ width: "min(100%, 360px)", opacity: 0.8 }} />
          <span className="t-heading">Nobody yet</span>
          <span className="c-secondary">The board fills up as people follow your week. Your own page is the link to hand out.</span>
        </div>
      ) : (
        <>
          <section className="rl-crew" aria-label="The crew this week">
            <div><span className="n">{rows.length}</span><span className="l">running with you</span></div>
            <div><span className="n">{toDistance(crewM, units).toFixed(0)}</span><span className="l">{U} together</span></div>
            <div><span className="n">{crewRuns}</span><span className="l">runs</span></div>
            <div><span className="n">{onStreak}</span><span className="l">on a streak</span></div>
          </section>

          <ol className="rl-board">
            {board.map((r, i) => {
              const moved = r.weekM - r.lastWeekM;
              const pct = Math.round((r.weekM / top) * 100);
              const first = r.profile.displayName.split(" ")[0] || r.profile.handle;
              return (
                <li key={r.profile.id + r.programTitle} data-rank={i < 3 ? i + 1 : undefined}>
                  <span className="rank">{i < 3 ? MEDAL[i] : i + 1}</span>
                  <span className="rl-avatar who">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.profile.avatarUrl ? <img src={r.profile.avatarUrl} alt="" /> : <span className="ini">{first[0]}</span>}
                  </span>
                  <span className="body">
                    <span className="top">
                      <b>{r.profile.displayName}</b>
                      {r.streak >= 2 && <span className="streak">{r.streak} weeks running</span>}
                      {r.planned > 0 && r.done >= r.planned && <span className="badge">Full week</span>}
                      {r.longestM > 0 && longest?.profile.id === r.profile.id && <span className="badge">Longest run</span>}
                    </span>
                    <span className="bar" aria-hidden><i style={{ width: `${pct}%` }} /></span>
                    <span className="days" aria-label="Days run this week">
                      {DOW.map((d, n) => <i key={n} data-on={r.ranDays.includes(n + 1) ? "true" : undefined}>{d}</i>)}
                    </span>
                  </span>
                  <span className="score">
                    <b>{toDistance(r.weekM, units).toFixed(1)}</b><span className="u">{U}</span>
                    <span className="move" data-dir={moved > 200 ? "up" : moved < -200 ? "down" : undefined}>
                      {moved > 200 ? `▲ ${fmtDistance(moved, units, { decimals: 0 })}` : moved < -200 ? `▼ ${fmtDistance(-moved, units, { decimals: 0 })}` : "level"}
                    </span>
                    <span className="plan">{r.planned > 0 ? `${r.done}/${r.planned} of your week` : "no plan yet"}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          {best && best.weekM > 0 && (
            <span className="rl-help">
              {best.profile.displayName.split(" ")[0]} leads with {fmtDistance(best.weekM, units)} {U}.
              {best.lastRun ? ` Last run ${MONTHS[new Date(best.lastRun).getMonth()]} ${new Date(best.lastRun).getDate()}.` : ""}
            </span>
          )}
        </>
      )}
    </main>
  );
}
