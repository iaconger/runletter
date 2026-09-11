// The mark and lockup are inlined so they take currentColor and need no image request.
// Source of truth for the paths: 05-brand/logo/ in the project docs. Do not edit the path data by hand.

import markPath from "@/lib/brand/mark-path";
import wordmarkPath from "@/lib/brand/wordmark-path";

export function Mark({ size = 28, title = "RunLetter" }: { size?: number; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title}>
      <path fill="currentColor" fillRule="evenodd" d={markPath} />
    </svg>
  );
}

// Lockup rule from foundations.md: shared baseline, mark 1.2x cap height, gap 20.
const CAP = 100 / 1.2;
const WM_SCALE = CAP / 71.0; // Geist SemiBold cap height at size 100 is ~71
const WM_TX = 120;
const WM_WIDTH = 476;
const TOTAL = WM_TX + WM_WIDTH * WM_SCALE + 4;

export function Lockup({ height = 28, title = "RunLetter" }: { height?: number; title?: string }) {
  return (
    <svg viewBox={`0 0 ${TOTAL.toFixed(0)} 100`} height={height} role="img" aria-label={title}>
      <path fill="currentColor" fillRule="evenodd" d={markPath} />
      <g transform={`translate(${WM_TX} 100) scale(${WM_SCALE.toFixed(4)})`}>
        <path fill="currentColor" d={wordmarkPath} />
      </g>
    </svg>
  );
}
