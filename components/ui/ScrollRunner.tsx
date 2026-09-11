"use client";
// A track lane pinned to the bottom of the viewport with the ink runner on it. Nothing moves on its own:
// scrolling is what turns the flipbook page and carries the runner along the lane. Scroll up and it runs back.
// Paper sprite + exclusion blend so it reads as ink on paper and as chalk on Night sections.
// Marketing and auth screens only; the studio and the follower app are working surfaces and stay clean.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const QUIET = ["/studio", "/app", "/welcome"];
const FRAMES = 8;
const PX_PER_FRAME = 36; // one stride frame per 36px of scroll, so a screen of scrolling is a couple of strides
const W = 120;
const H = Math.round((W * 220) / 240);

export function ScrollRunner() {
  const pathname = usePathname();
  const runner = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const quiet = QUIET.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (quiet) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, y / max);
      const frame = reduce ? 0 : Math.floor(y / PX_PER_FRAME) % FRAMES;
      // Lane runs from the left gutter to about four fifths of the width, so the runner never sits under the scrollbar.
      const lane = window.innerWidth - W - 48;
      if (runner.current) runner.current.style.transform = `translateX(${24 + lane * progress * 0.8}px)`;
      if (strip.current) strip.current.style.transform = `translateX(${(-100 * frame) / FRAMES}%)`;
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
    <div className="rl-lane" aria-hidden="true">
      <div ref={runner} className="rl-lane-runner" style={{ width: W, height: H }}>
        <div ref={strip} className="rl-lane-strip" style={{ backgroundImage: "url(/brand/ink/stride-sprite-paper.svg)", backgroundSize: `${W * FRAMES}px ${H}px` }} />
      </div>
    </div>
  );
}
