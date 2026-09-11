// Public creator page: /c/:handle. Where a follower lands from the creator's bio link.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mark } from "@/components/ui/Logo";
import { Cover, Ink, Portrait, coverFor } from "@/components/ui/Ink";
import { sampleCreator, sampleProgram } from "@/lib/sample";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: handle === sampleCreator.handle ? sampleCreator.displayName : "Creator" };
}

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (handle !== sampleCreator.handle) notFound(); // phase 2: profiles lookup
  const c = sampleCreator;

  return (
    <main>
      <div className="rl-atmo rl-atmo-dawn" style={{ padding: "var(--rl-space-12) 0", overflow: "hidden" }}>
        <div className="rl-page rl-stack" style={{ paddingBlock: 0, gap: "var(--rl-space-4)", position: "relative" }}>
          <Ink name="pace-group" style={{ position: "absolute", right: "-6%", top: "-10%", width: "min(52%, 300px)", opacity: 0.85, pointerEvents: "none" }} />
          <Link href="/" className="rl-logo" style={{ color: "inherit" }} aria-label="RunLetter"><Mark size={28} /></Link>
          <div className="rl-row"><Portrait name="sarah" size={64} /><span className="t-label" style={{ opacity: 0.7 }}>@{c.handle}</span></div>
          <h1 className="t-display-xl" style={{ margin: 0 }}>{c.displayName}</h1>
          <p className="t-body" style={{ margin: 0, maxWidth: "48ch" }}>{c.bio}</p>
          <div className="rl-row">
            <Link href={`/login?next=/c/${c.handle}/${sampleProgram.id}`} className="rl-btn rl-btn-lg" style={{ background: "var(--rl-ink-900)", color: "var(--rl-paper-100)" }}>
              Subscribe · $7/mo
            </Link>
            <span className="rl-help" style={{ color: "inherit", opacity: 0.7 }}>Cancel any time. Sold on the web.</span>
          </div>
        </div>
      </div>
      <section className="rl-page rl-stack" style={{ gap: "var(--rl-space-4)" }}>
        <span className="t-label c-muted">Programs</span>
        <Link href={`/c/${c.handle}/${sampleProgram.id}`} className="rl-card" style={{ color: "inherit", textDecoration: "none" }}>
          <Cover name={coverFor(sampleProgram)} ratio={21 / 9} />
          <span className="t-heading">{sampleProgram.title}</span>
          <span className="c-secondary">{sampleProgram.description}</span>
          <span className="rl-row">
            <span className="rl-chip">{sampleProgram.weeks} weeks</span>
            <span className="rl-chip">{sampleProgram.level}</span>
            <span className="rl-chip rl-chip-accent">Included</span>
          </span>
        </Link>
      </section>
    </main>
  );
}
