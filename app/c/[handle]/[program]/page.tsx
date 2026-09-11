// Public program page: /c/:handle/:program. Shows week 1 in full, the rest as a shape.
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockBar } from "@/components/run/BlockBar";
import { Cover, coverFor } from "@/components/ui/Ink";
import { CreatorNote, WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { sampleCreator, sampleProgram, sampleWeek } from "@/lib/sample";
import { dayDurationS, fmtMinutes } from "@/lib/types";

export const metadata = { title: sampleProgram.title };

export default async function ProgramPage({ params }: { params: Promise<{ handle: string; program: string }> }) {
  const { handle, program } = await params;
  if (handle !== sampleCreator.handle || program !== sampleProgram.id) notFound();
  const p = sampleProgram;
  const preview = sampleWeek.find((d) => d.runType === "tempo")!;

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-8)" }}>
      <Cover name={coverFor(p)} ratio={21 / 9} />
      <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
        <Link href={`/c/${handle}`} className="t-label">← {sampleCreator.displayName}</Link>
        <h1 className="t-display-xl" style={{ margin: 0 }}>{p.title}</h1>
        <p className="c-secondary" style={{ margin: 0 }}>{p.description}</p>
        <div className="rl-row">
          <span className="rl-chip">{p.weeks} weeks</span>
          <span className="rl-chip">{p.level}</span>
          <span className="rl-chip">4 runs / week</span>
        </div>
      </div>
      <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
        <span className="t-label c-muted">A sample week</span>
        <WeekStrip days={sampleWeek} />
      </div>
      <div className="rl-card">
        <span className="t-label c-muted">A sample day</span>
        <h2 className="t-title" style={{ margin: 0 }}>{dayTitle(preview)}</h2>
        <span className="t-numeral-lg">{fmtMinutes(dayDurationS(preview))}</span>
        <BlockBar blocks={preview.blocks} />
        <CreatorNote note={preview.note} by={sampleCreator.displayName} />
      </div>
      <Link href={`/login?next=/app`} className="rl-btn rl-btn-primary rl-btn-lg">Subscribe to {sampleCreator.displayName} · $7/mo</Link>
    </main>
  );
}
