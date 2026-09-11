// Paper-and-ink sketches. Drawn procedurally (05-brand/illustration/generate.py), served as SVG.
// tone="ink" for paper/light surfaces, tone="paper" for Night/dark surfaces. Decorative by default.

import type { CSSProperties } from "react";
import type { Program, ProgramDay } from "@/lib/types";

export type InkName = "stride" | "sequence" | "cadence" | "route" | "dawn-road" | "breath" | "intervals" | "pace-group";

const FILE: Record<InkName, string> = {
  stride: "01-stride",
  sequence: "02-sequence",
  cadence: "03-cadence",
  route: "04-route",
  "dawn-road": "05-dawn-road",
  breath: "06-breath",
  intervals: "07-intervals",
  "pace-group": "08-pace-group",
};

// Cropped viewBox ratios of the transparent variants (see CROP in generate.py).
export const INK_RATIO: Record<InkName, number> = {
  stride: 480 / 270,
  sequence: 760 / 300,
  cadence: 700 / 110,
  route: 550 / 290,
  "dawn-road": 760 / 380,
  breath: 600 / 220,
  intervals: 740 / 150,
  "pace-group": 580 / 292,
};

export function inkSrc(name: InkName, tone: "ink" | "paper" = "ink") {
  return `/brand/ink/${FILE[name]}-${tone}.svg`;
}

export function Ink({
  name,
  tone = "ink",
  alt = "",
  style,
  className,
}: {
  name: InkName;
  tone?: "ink" | "paper";
  alt?: string;
  style?: CSSProperties;
  className?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={inkSrc(name, tone)} alt={alt} aria-hidden={alt === "" || undefined} draggable={false} className={className} style={{ display: "block", maxWidth: "100%", ...style }} />;
}

/** Which sketch stands in for a program with no cover. Goal first, then the run mix. */
export function coverFor(p: Pick<Program, "goal" | "days">): InkName {
  const types = new Set(p.days.map((d: ProgramDay) => d.runType).filter(Boolean));
  if (p.goal === "base") return "route";
  if (p.goal === "5k" || types.has("intervals")) return "intervals";
  if (p.goal === "marathon" || p.goal === "half") return "sequence";
  if (types.has("recovery")) return "breath";
  return "cadence";
}

/** A cover tile: sketch on paper with a hairline, fixed ratio so cards line up. */
export function Cover({ name, ratio = 16 / 9, style }: { name: InkName; ratio?: number; style?: CSSProperties }) {
  return (
    <div
      className="rl-sunken"
      style={{
        aspectRatio: `${ratio}`,
        borderRadius: "var(--rl-radius-md)",
        overflow: "hidden",
        border: "var(--rl-border-hairline) solid var(--rl-hairline)",
        position: "relative",
        ...style,
      }}
    >
      <Ink name={name} style={{ position: "absolute", left: "8%", top: "8%", width: "84%", height: "84%", objectFit: "contain" }} />
    </div>
  );
}
