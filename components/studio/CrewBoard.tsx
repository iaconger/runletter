// The runners board: who ran what this week, who is on a streak, who moved. Shared by the studio and by
// the public walkthrough, so what a creator is shown is the screen they would actually get.
import type { RunnerRow } from "@/lib/db/programs";
import { distanceLabel, fmtDistance, toDistance } from "@/lib/units";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const MEDAL = ["1st", "2nd", "3rd"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CrewBoard({ rows, units }: { rows: RunnerRow[]; units: "km" | "mi" }) {
  const U = distanceLabel(units);
  const board = [...rows].sort((a, b) => b.weekM - a.weekM || b.done - a.done);
  const crewM = rows.reduce((a, r) => a + r.weekM, 0);
  const crewRuns = rows.reduce((a, r) => a + r.ranDays.length, 0);
  const best = board[0] ?? null;
  const longest = rows.reduce((m, r) => (r.longestM > (m?.longestM ?? 0) ? r : m), null as RunnerRow | null);
  const onStreak = rows.filter((r) => r.streak >= 2).length;
  const top = Math.max(1, ...board.map((r) => r.weekM));

  return (
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
  );
}
