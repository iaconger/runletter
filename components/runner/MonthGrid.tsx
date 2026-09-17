// The month, as a grid: what the people you follow put on each day, what you dragged on yourself, and
// what you actually ran. One component so the real home and the public walkthrough show the same screen.
import Link from "next/link";
import { RUN_TYPE_LABEL } from "@/lib/types";
import { distanceLabel, toDistance } from "@/lib/units";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type TheirDay = { dayId: string; date: string; kind: string; runType: string | null; creator: { name: string } };
export type DroppedDay = { id: string; date: string; day: { id: string; runType: string | null } };
export type MyRunDay = { id: string; date: string; name: string | null; sportType: string; distanceM: number | null };

export function MonthGrid({
  first, gridStart, cells, today, units, theirs, dropped, mine, links = true,
}: {
  first: Date; gridStart: Date; cells: number; today: string; units: "km" | "mi";
  theirs: TheirDay[]; dropped: DroppedDay[]; mine: MyRunDay[];
  /** Off in the public walkthrough, where there is nothing behind the links. */
  links?: boolean;
}) {
  const byTheirs = new Map<string, TheirDay[]>();
  for (const d of theirs) byTheirs.set(d.date, [...(byTheirs.get(d.date) ?? []), d]);
  const byDropped = new Map<string, DroppedDay[]>();
  for (const d of dropped) byDropped.set(d.date, [...(byDropped.get(d.date) ?? []), d]);
  const byMine = new Map<string, MyRunDay[]>();
  for (const x of mine) byMine.set(x.date, [...(byMine.get(x.date) ?? []), x]);

  const label = (d: { kind: string; runType: string | null }) =>
    d.kind === "rest" ? "Rest" : d.kind === "cross" ? "Cross" : d.runType ? RUN_TYPE_LABEL[d.runType as keyof typeof RUN_TYPE_LABEL] : "Run";

  return (
    <section className="rl-month" aria-label={`${MONTHS[first.getMonth()]} ${first.getFullYear()}`}>
      <div className="dow" aria-hidden>{DOW.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="grid">
        {Array.from({ length: cells }, (_, i) => {
          const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
          const date = iso(d);
          const out = d.getMonth() !== first.getMonth();
          return (
            <div key={date} className="cell" data-out={out ? "true" : undefined} data-today={date === today ? "true" : undefined}>
              <span className="n">{d.getDate()}</span>
              {(byTheirs.get(date) ?? []).map((p) => {
                const inner = <><b>{p.creator.name.split(" ")[0]}</b><span>{label(p)}</span></>;
                const cls = "plan";
                const run = p.kind === "run" ? p.runType ?? "easy" : p.kind;
                return links
                  ? <Link key={p.dayId} href={`/app/run/${p.dayId}`} className={cls} data-run={run} title={`${p.creator.name} · ${label(p)}`}>{inner}</Link>
                  : <span key={p.dayId} className={cls} data-run={run} title={`${p.creator.name} · ${label(p)}`}>{inner}</span>;
              })}
              {(byDropped.get(date) ?? []).map((p) => {
                const inner = <><b>Yours</b><span>{p.day.runType ? RUN_TYPE_LABEL[p.day.runType as keyof typeof RUN_TYPE_LABEL] : "Run"}</span></>;
                return links
                  ? <Link key={p.id} href={`/app/run/${p.day.id}`} className="plan mine" data-run={p.day.runType ?? "easy"}>{inner}</Link>
                  : <span key={p.id} className="plan mine" data-run={p.day.runType ?? "easy"}>{inner}</span>;
              })}
              {(byMine.get(date) ?? []).map((x) => {
                const inner = <>✓ {x.distanceM ? `${toDistance(x.distanceM, units).toFixed(1)} ${distanceLabel(units)}` : x.sportType}</>;
                return links
                  ? <Link key={x.id} href={`/app/log/${x.id}`} className="did" title={x.name ?? x.sportType}>{inner}</Link>
                  : <span key={x.id} className="did" title={x.name ?? x.sportType}>{inner}</span>;
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
