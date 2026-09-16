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

/**
 * A pair, as a mark. A drawn shoe needs detail to read as a shoe, and that detail dies below about 40px,
 * where these actually live. So: the colour the runner picked, with the brand's initial. Crisp at any size,
 * honest about being a label rather than a picture.
 */
export function Shoe({ tint = "var(--rl-accent)", size = 26, letter = "" }: { tint?: string; size?: number; letter?: string }) {
  return (
    <span className="rl-shoechip" aria-hidden style={{ width: size, height: size, background: tint, fontSize: Math.round(size * 0.46) }}>
      {letter.slice(0, 1).toUpperCase()}
    </span>
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
              <Shoe tint="var(--tint)" size={22} letter={(s.brand ?? s.name ?? "").trim()} />
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
                : <Shoe tint="var(--tint)" size={22} letter={brandName(s.brand)} />}
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
