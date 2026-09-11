// The ink runner, running. Eight stride frames in one SVG sprite, stepped by CSS. Still under reduced motion.
import type { CSSProperties } from "react";

export function Flipbook({ tone = "ink", width = 240, style }: { tone?: "ink" | "paper"; width?: number; style?: CSSProperties }) {
  const h = Math.round((width * 220) / 240);
  return (
    <div className="rl-flip" aria-hidden="true" style={{ width, height: h, ...style }}>
      <div className="rl-flip-strip" style={{ backgroundImage: `url(/brand/ink/stride-sprite-${tone}.svg)`, backgroundSize: `${width * 8}px ${h}px` }} />
    </div>
  );
}
