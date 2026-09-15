// A list of runs the person actually did: planned ones and off-plan ones, from Strava or by hand.
import Link from "next/link";
import type { RunLogItem } from "@/lib/db/programs";
import { fmtDistanceUnit, fmtPace, paceLabel, type Units } from "@/lib/units";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y!, m! - 1, d!); return `${DAYS[dt.getDay()]} ${MONTHS[dt.getMonth()]} ${dt.getDate()}`; };

export function RunLog({ runs, empty = "No runs yet.", units = "km" }: { runs: RunLogItem[]; empty?: string; units?: Units }) {
  if (runs.length === 0) return <span className="rl-help">{empty}</span>;
  return (
    <ul className="rl-runlog">
      {runs.map((r) => (
        <li key={r.id}>
          <Link href={`/app/log/${r.id}`}>
            <span className="d">{label(r.date)}</span>
            <span className="t">
              {r.title}
              {!r.planned && ["Run", "TrailRun", "VirtualRun"].includes(r.sportType) && <span className="rl-chip" style={{ marginLeft: 8, fontSize: 11 }}>off plan</span>}
              {!["Run", "TrailRun", "VirtualRun"].includes(r.sportType) && <span className="rl-chip" style={{ marginLeft: 8, fontSize: 11 }}>{r.sportType.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>}
            </span>
            <span className="m">
              {r.distanceM ? fmtDistanceUnit(r.distanceM, units) : ""}
              {r.durationS ? ` · ${Math.round(r.durationS / 60)} min` : ""}
              {r.avgPaceS ? ` · ${fmtPace(r.avgPaceS, units)} ${paceLabel(units)}` : ""}
            </span>
            <span className="go" aria-hidden>→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
