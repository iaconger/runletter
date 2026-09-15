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

// Lockup: the mark and the caps are the same height on the same baseline. Measured, not guessed —
// mark ink is 99.99 tall in its 100 box, the wordmark's cap height is 71 at size 100, and the viewBox
// is the union of both inks so the U's overshoot is never clipped.
const H = 100; // shared height: mark ink and cap height
const MARK_S = 1.0001;
const MARK_TY = -0.05;
const WM_S = 1.40647; // scales the caps so their ink is exactly as tall as the mark (100 / 71.1)
const WM_TX = 114.75; // mark width + 26 gap, less the R's left bearing
const VB_TOP = 0;
const VB_H = 102.25; // includes the U's overshoot below the baseline
const VB_W = 983;

export function Lockup({ height = 28, title = "RunLetter" }: { height?: number; title?: string }) {
  return (
    <svg viewBox={`0 ${VB_TOP} ${VB_W} ${VB_H}`} height={(height * VB_H) / H} style={{ maxWidth: "100%" }} role="img" aria-label={title}>
      <g transform={`translate(0 ${MARK_TY}) scale(${MARK_S})`}>
        <path fill="currentColor" fillRule="evenodd" d={markPath} />
      </g>
      <g transform={`translate(${WM_TX} ${H}) scale(${WM_S})`}>
        <path fill="currentColor" d={wordmarkPath} />
      </g>
    </svg>
  );
}
