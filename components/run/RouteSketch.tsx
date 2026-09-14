// A run's route as an ink line: Strava's summary polyline decoded and drawn as one stroke, no map behind it.
// Fits the sketch language of the brand and says "this is your run" without a tile server.

export function decodePolyline(str: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d; else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

export function RouteSketch({ polyline, size = 160, stroke = "currentColor", className, style }: { polyline: string; size?: number; stroke?: string; className?: string; style?: React.CSSProperties }) {
  const pts = decodePolyline(polyline);
  if (pts.length < 2) return null;
  const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180); // longitude degrees shrink with latitude
  const w = (maxLng - minLng) * kx || 1e-6, h = maxLat - minLat || 1e-6;
  const pad = 6;
  const scale = (size - pad * 2) / Math.max(w, h);
  const ox = (size - w * scale) / 2, oy = (size - h * scale) / 2;
  const d = pts.map(([la, ln], i) => `${i ? "L" : "M"}${(ox + (ln - minLng) * kx * scale).toFixed(1)} ${(oy + (maxLat - la) * scale).toFixed(1)}`).join(" ");
  const [sla, sln] = pts[0]!;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className} style={style} aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <circle cx={ox + (sln - minLng) * kx * scale} cy={oy + (maxLat - sla) * scale} r={3.5} fill="var(--rl-accent)" />
    </svg>
  );
}
