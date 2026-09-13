// A list of runs the person actually did: planned ones and off-plan ones, from Strava or by hand.
import type { RunLogItem } from "@/lib/db/programs";
import { fmtPaceShort } from "@/lib/paces";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y!, m! - 1, d!); return `${DAYS[dt.getDay()]} ${MONTHS[dt.getMonth()]} ${dt.getDate()}`; };

export function RunLog({ runs, empty = "No runs yet." }: { runs: RunLogItem[]; empty?: string }) {
  if (runs.length === 0) return <span className="rl-help">{empty}</span>;
  return (
    <ul className="rl-runlog">
      {runs.map((r) => (
        <li key={r.id}>
          <span className="d">{label(r.date)}</span>
          <span className="t">
            {r.title}
            {!r.planned && <span className="rl-chip" style={{ marginLeft: 8, fontSize: 11 }}>off plan</span>}
          </span>
          <span className="m">
            {r.distanceM ? `${(r.distanceM / 1000).toFixed(1)} km` : ""}
            {r.durationS ? ` · ${Math.round(r.durationS / 60)} min` : ""}
            {r.avgPaceS ? ` · ${fmtPaceShort(r.avgPaceS)} /km` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
