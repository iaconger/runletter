"use client";
// Flips the sticky header to Night while a Night section is passing underneath it, so the bar never sits
// paper-on-paper over the hero or the closing band. Reads the sections on scroll, writes one class.

import { useEffect } from "react";

export function HeaderTone() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".rl-header");
    if (!header) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".rl-atmo-night"));
    let raf = 0;
    const paint = () => {
      raf = 0;
      const h = header.getBoundingClientRect();
      const mid = h.top + h.height / 2;
      const over = sections.some((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      header.classList.toggle("is-night", over);
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
  }, []);
  return null;
}
