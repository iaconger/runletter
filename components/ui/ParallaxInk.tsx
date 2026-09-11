"use client";
// Faint ink sketches on the paper behind the page. Each one drifts at its own rate as you scroll, so the page
// gets depth without anything moving on its own. The layer sits under the content: Night and Dawn sections,
// cards and photos cover it, so it only ever shows on bare paper. Same quiet routes as the scroll lane.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const QUIET = ["/studio", "/app", "/welcome"];

type Piece = { name: string; x: string; y: number; w: number; speed: number; rot?: number; flip?: boolean };
// y is the start position as a fraction of the viewport height; speed is how much of the scroll it follows
// (0 = pinned to the glass, 1 = moves with the page). Small numbers read as far away.
const PIECES: Piece[] = [
  { name: "04-route", x: "68%", y: 0.12, w: 520, speed: 0.18, rot: -6 },
  { name: "03-cadence", x: "-6%", y: 0.55, w: 620, speed: 0.1 },
  { name: "06-breath", x: "72%", y: 1.05, w: 360, speed: 0.28, rot: 4 },
  { name: "05-dawn-road", x: "4%", y: 1.5, w: 560, speed: 0.14, flip: true },
  { name: "07-intervals", x: "60%", y: 2.1, w: 480, speed: 0.22 },
  { name: "02-sequence", x: "-2%", y: 2.7, w: 520, speed: 0.08, rot: 3 },
];

export function ParallaxInk() {
  const pathname = usePathname();
  const refs = useRef<(HTMLImageElement | null)[]>([]);
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
        const h = el.offsetHeight || p.w * 0.6;
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.name}
          ref={(el) => {
            refs.current[i] = el;
          }}
          src={`/brand/ink/${p.name}-paper.svg`}
          alt=""
          draggable={false}
          style={{ left: p.x, width: p.w }}
        />
      ))}
    </div>
  );
}
