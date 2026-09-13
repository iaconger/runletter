import Link from "next/link";
import { sampleCreator, sampleProgram } from "@/lib/sample";
import { Cover, Portrait, coverFor } from "@/components/ui/Ink";

export const metadata = { title: "Creators" };

export default function Creators() {
  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <h1 className="t-display-lg" style={{ margin: 0 }}>Creators</h1>
      <Link href={`/c/${sampleCreator.handle}`} className="rl-card" style={{ color: "inherit", textDecoration: "none" }}>
        <Cover name={coverFor(sampleProgram)} ratio={21 / 9} />
        <span className="rl-row"><Portrait name="sarah" size={44} /><span className="t-heading">{sampleCreator.displayName}</span></span>
        <span className="c-secondary">{sampleCreator.bio}</span>
        <span className="rl-row">
          <span className="rl-chip rl-chip-success">Subscribed</span>
          <span className="rl-help">Following: {sampleProgram.title}</span>
        </span>
      </Link>
      <p className="rl-help">Phase 3 adds discovery. For now, followers arrive through a creator&rsquo;s link.</p>
    </main>
  );
}
