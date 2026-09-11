import { WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { sampleCompletedDays, sampleProgram, sampleToday, sampleWeek } from "@/lib/sample";

export const metadata = { title: "Week" };

export default function Week() {
  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <div className="rl-stack" style={{ gap: "var(--rl-space-1)" }}>
        <span className="t-label c-muted">Week 3 of {sampleProgram.weeks}</span>
        <h1 className="t-display-lg" style={{ margin: 0 }}>{sampleProgram.title}</h1>
      </div>
      <WeekStrip days={sampleWeek} todayDay={sampleToday.day} done={sampleCompletedDays} hrefFor={(d) => `/app?day=${d.day}`} />
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {sampleWeek.map((d) => (
          <li key={d.id} className="rl-between" style={{ padding: "12px 0", borderBottom: "1px solid var(--rl-hairline)" }}>
            <span className="t-body-medium">{dayTitle(d)}</span>
            <span className="c-muted">{sampleCompletedDays.has(d.day) ? "Done" : d.day === sampleToday.day ? "Today" : ""}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
