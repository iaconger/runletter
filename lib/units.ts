// Miles or kilometres. Everything is stored metric; this is the one place that turns metres and seconds
// per kilometre into what the runner asked to see.

export type Units = "km" | "mi";
const MI = 1609.344;

export const distanceLabel = (u: Units) => (u === "mi" ? "mi" : "km");
export const paceLabel = (u: Units) => (u === "mi" ? "/mi" : "/km");
export const climbLabel = (u: Units) => (u === "mi" ? "ft" : "m");

/** Metres to the runner's unit, as a number. */
export const toDistance = (m: number, u: Units) => (u === "mi" ? m / MI : m / 1000);

/** "8.2" or "12" — one decimal under ten, none above, unless told otherwise. */
export function fmtDistance(m: number | null | undefined, u: Units, opts: { decimals?: number } = {}): string {
  if (m == null) return "–";
  const v = toDistance(m, u);
  const d = opts.decimals ?? (v >= 100 ? 0 : v >= 10 ? 1 : 1);
  return v.toFixed(d);
}

/** "8.2 km" / "5.1 mi". */
export const fmtDistanceUnit = (m: number | null | undefined, u: Units, opts?: { decimals?: number }) =>
  m == null ? "–" : `${fmtDistance(m, u, opts)} ${distanceLabel(u)}`;

/** Seconds per kilometre to seconds per the runner's unit. */
export const toPace = (sPerKm: number, u: Units) => Math.round(u === "mi" ? sPerKm * (MI / 1000) : sPerKm);

/** "5:20" in the runner's unit. */
export function fmtPace(sPerKm: number | null | undefined, u: Units): string {
  if (sPerKm == null) return "–";
  const s = toPace(sPerKm, u);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "5:20 /mi". */
export const fmtPaceUnit = (sPerKm: number | null | undefined, u: Units) =>
  sPerKm == null ? "–" : `${fmtPace(sPerKm, u)} ${paceLabel(u)}`;

/** Metres of climb in feet when the runner is on miles. */
export const fmtClimb = (m: number | null | undefined, u: Units) =>
  m == null ? "–" : `${Math.round(u === "mi" ? m * 3.28084 : m)}`;
