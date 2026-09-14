// A program's cover: the creator's photo when they set one, the ink sketch for its goal or type otherwise.
import { Cover, coverFor } from "@/components/ui/Ink";
import type { Program } from "@/lib/types";

export function ProgramCover({ p, ratio = 21 / 9, radius = "var(--rl-radius-md)" }: { p: Pick<Program, "coverUrl" | "goal" | "days">; ratio?: number; radius?: string }) {
  if (p.coverUrl) {
    return (
      <span style={{ display: "block", aspectRatio: `${ratio}`, borderRadius: radius, overflow: "hidden", border: "var(--rl-border-hairline) solid var(--rl-hairline)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </span>
    );
  }
  return <Cover name={coverFor(p)} ratio={ratio} />;
}
