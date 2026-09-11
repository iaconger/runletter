// Proportional bar of a run's blocks. Width = share of total time; shade = effort.
// Matches the "block bar" component in the design system.

import type { Block } from "@/lib/types";
import { expandBlocks } from "@/lib/fit/encode";

function blockSeconds(b: Block): number {
  return b.measure === "time" ? (b.durationS ?? 0) : Math.round(((b.distanceM ?? 0) / 1000) * (b.targetPaceMin ?? 360));
}

export function BlockBar({ blocks, currentIndex, legend = true }: { blocks: Block[]; currentIndex?: number; legend?: boolean }) {
  const steps = expandBlocks(blocks);
  return (
    <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
      <div className="rl-blockbar" aria-hidden="true">
        {steps.map((b, i) => (
          <i
            key={i}
            data-effort={b.targetEffort ?? "easy"}
            data-current={currentIndex === i ? "true" : undefined}
            style={{ flex: `${blockSeconds(b)} 0 0`, minWidth: 3, ["--i" as string]: i }}
          />
        ))}
      </div>
      {legend && (
        <div className="rl-legend">
          <span data-effort="easy">Easy</span>
          <span data-effort="moderate">Moderate</span>
          <span data-effort="hard">Hard</span>
          {currentIndex != null && <span data-current="true">Now</span>}
        </div>
      )}
    </div>
  );
}
