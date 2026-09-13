"use client";
// Faint ink sketches on the paper behind the page. Each one drifts at its own rate as you scroll, so the page
// gets depth without anything moving on its own. The layer sits under the content: Night and Dawn sections,
// cards and photos cover it, so it only ever shows on bare paper. Same quiet routes as the scroll lane.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const QUIET = ["/studio", "/app", "/welcome"];

type Piece = { name: string; x: string; y: number; w: number; speed: number; rot?: number; flip?: boolean; blue?: boolean };
// Margins only: x is the left edge as a fraction of the viewport, pieces sit in the outer fifth on either side.
// y is the start position in viewport heights; speed is how much of the scroll it follows (0 = pinned to the
// glass, 1 = moves with the page). Small numbers read as far away. Blue pieces use the accent, sparingly.
const PIECES: Piece[] = [
  { name: "04-route", x: "82%", y: 0.1, w: 420, speed: 0.18, rot: -6, blue: true },
  { name: "03-cadence", x: "-10%", y: 0.6, w: 460, speed: 0.1 },
  { name: "06-breath", x: "84%", y: 1.1, w: 300, speed: 0.28, rot: 4 },
  { name: "05-dawn-road", x: "-6%", y: 1.55, w: 420, speed: 0.14, flip: true, blue: true },
  { name: "07-intervals", x: "80%", y: 2.1, w: 380, speed: 0.22 },
  { name: "02-sequence", x: "-8%", y: 2.7, w: 400, speed: 0.08, rot: 3 },
  { name: "01-stride", x: "86%", y: 3.2, w: 260, speed: 0.2, blue: true },
];

export function ParallaxInk() {
  const pathname = usePathname();
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const quiet = QUIET.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (quiet) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      PIECES.forEach((p, i) => {
        const el = refs.current[i];
        if (!el) return;
        const h = p.w * 0.6;
        const span = vh + h;
        // Where this piece is on the glass right now, wrapped so it comes back around on long pages.
        let top = p.y * vh - y * (reduce ? 0 : p.speed);
        top = ((((top + h) % span) + span) % span) - h;
        el.style.transform = `translateY(${top}px) rotate(${p.rot ?? 0}deg)${p.flip ? " scaleX(-1)" : ""}`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [quiet, pathname]);

  if (quiet) return null;
  return (
    <div className="rl-parallax" aria-hidden="true">
      {PIECES.map((p, i) => (
        <div
          key={p.name}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={p.blue ? "rl-parallax-blue" : undefined}
          style={{ left: p.x, width: p.w, height: p.w * 0.6, ["--mask" as string]: `url(/brand/ink/${p.name}-ink.svg)` }}
        />
      ))}
    </div>
  );
}
