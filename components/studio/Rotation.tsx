// The shoe rotation, straight from Strava: what they run in, and how far each pair has gone. Nobody types
// it and nobody keeps it current; it is simply true. Drawn, not photographed, so no retailer image can rot
// and no brand mark is borrowed.
import type { StravaShoe } from "@/lib/integrations/strava";
import type { Shoe as PickedShoe } from "@/lib/db/programs";
import { brandName, colourValue } from "@/lib/shoes/catalog";
import { distanceLabel, fmtDistance, toDistance, type Units } from "@/lib/units";

/** Roughly where a pair is in its life. Not a rule, a hint: most shoes are done somewhere near here. */
const LIFE_KM = 800;
const TINTS = ["var(--rl-accent)", "var(--rl-run-long)", "var(--rl-run-tempo)", "var(--rl-run-recovery)", "var(--rl-run-intervals)", "var(--rl-run-race)"];

export function Shoe({ tint = "currentColor", size = 26 }: { tint?: string; size?: number }) {
  return (
    <svg viewBox="0 0 104 40" width={size * 2.6} height={size} aria-hidden style={{ flex: "none" }}>
      <path fill={tint} d="M6 29.5 C4.5 33 6.5 36.5 13 36.5 L84 36.5 C94 36.5 100.5 33.5 100.5 30 C100.5 27.5 97 26.5 91 27 L13 27.5 C9 27.5 7 28.2 6 29.5 Z" />
      <path fill="currentColor" d="M8.5 27.5 C7.5 20 8.5 13.5 13 10.5 C17 8 21.5 8.5 23.5 11.5 C25 14 25.5 16.5 27.5 17.5 C34 20.5 46 22 60 22.8 C74 23.6 84 23.2 90 22.6 C95 22.2 97.5 24 97 26.8 L8.5 27.5 Z" />
    </svg>
  );
}

export function Rotation({ shoes: all, units = "km", title = "What they run in" }: { shoes: StravaShoe[]; units?: Units; title?: string }) {
  const shoes = all.filter((s) => !s.hidden);
  if (!shoes.length) return null;
  const U = distanceLabel(units);
  return (
    <section className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
      <div className="rl-between" style={{ alignItems: "baseline" }}>
        <span className="t-label c-muted">{title}</span>
        <span className="rl-help">from Strava</span>
      </div>
      <ul className="rl-rotation">
        {shoes.slice(0, 5).map((s, i) => {
          const km = toDistance(s.distanceM, units);
          const worn = Math.min(100, Math.round((km / (units === "mi" ? LIFE_KM * 0.62 : LIFE_KM)) * 100));
          const name = [s.brand, s.model].filter(Boolean).join(" ") || s.name;
          return (
            <li key={s.id} style={{ ["--tint" as string]: TINTS[i % TINTS.length] }}>
              <Shoe tint="var(--tint)" size={20} />
              <span className="rl-stack" style={{ gap: 2, minWidth: 0 }}>
                <span className="nm">{name}{s.primary ? <em> · main pair</em> : null}</span>
                <span className="bar" aria-hidden><i style={{ width: `${worn}%` }} /></span>
              </span>
              <span className="km">{fmtDistance(s.distanceM, units, { decimals: 0 })} {U}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The rotation as stored on a profile, which is unknown JSON until it is checked. */
export function shoesOf(profileGear: unknown): StravaShoe[] {
  if (!Array.isArray(profileGear)) return [];
  return profileGear.filter((s): s is StravaShoe => !!s && typeof s === "object" && typeof (s as StravaShoe).id === "string");
}

/** The rotation a runner picked in the app. Takes precedence over whatever Strava guessed. */
export function PickedRotation({ shoes, units = "km", title = "What they run in" }: { shoes: PickedShoe[]; units?: Units; title?: string }) {
  if (!shoes.length) return null;
  const U = distanceLabel(units);
  return (
    <section className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
      <span className="t-label c-muted">{title}</span>
      <ul className="rl-rotation">
        {shoes.map((s) => {
          const km = toDistance(s.distanceM, units);
          const worn = Math.min(100, Math.round((km / (units === "mi" ? LIFE_KM * 0.62 : LIFE_KM)) * 100));
          return (
            <li key={s.id} style={{ ["--tint" as string]: colourValue(s.colour) }}>
              {s.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className="pic" src={s.imageUrl} alt="" width={52} height={34} loading="lazy" />
                : <Shoe tint="var(--tint)" size={20} />}
              <span className="rl-stack" style={{ gap: 2, minWidth: 0 }}>
                <span className="nm">{brandName(s.brand)} {s.model}{s.nickname ? <em> · {s.nickname}</em> : null}</span>
                {s.distanceM > 0 && <span className="bar" aria-hidden><i style={{ width: `${worn}%` }} /></span>}
              </span>
              <span className="km">{s.distanceM > 0 ? `${fmtDistance(s.distanceM, units, { decimals: 0 })} ${U}` : "new"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
