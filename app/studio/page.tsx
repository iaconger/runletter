import Link from "next/link";
import { sampleProgram } from "@/lib/sample";

export default function Programs() {
  return (
    <main className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <div className="rl-between">
        <h1 className="t-display-lg" style={{ margin: 0 }}>Programs</h1>
        <button className="rl-btn rl-btn-primary" type="button" disabled>New program</button>
      </div>
      <Link href={`/studio/programs/${sampleProgram.id}`} className="rl-card" style={{ color: "inherit", textDecoration: "none" }}>
        <div className="rl-between">
          <span className="t-heading">{sampleProgram.title}</span>
          <span className="rl-chip rl-chip-success">Published</span>
        </div>
        <span className="c-secondary">{sampleProgram.description}</span>
        <span className="rl-row">
          <span className="rl-chip">{sampleProgram.weeks} weeks</span>
          <span className="rl-chip">{sampleProgram.level}</span>
          <span className="rl-chip">{sampleProgram.goal}</span>
        </span>
      </Link>
      <p className="rl-help">Example program. Creating and saving programs lands in phase 2.</p>
    </main>
  );
}
