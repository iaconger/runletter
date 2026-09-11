// Studio home: your programs. Reads Supabase; shows the example program when signed out or empty so the shape is visible.
import Link from "next/link";
import { getMyProfile, listMyPrograms } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";
import { Cover, coverFor } from "@/components/ui/Ink";
import { sampleProgram } from "@/lib/sample";
import type { Program } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<Program["status"], string> = { draft: "rl-chip", published: "rl-chip rl-chip-success", archived: "rl-chip" };

export default async function Programs() {
  const configured = isConfigured();
  const [profile, programs] = configured ? await Promise.all([getMyProfile(), listMyPrograms()]) : [null, []];
  const needsHandle = profile && profile.handle.startsWith("u_");

  return (
    <main className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <div className="rl-between">
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">{profile ? `@${profile.handle}` : "Studio"}</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>Programs</h1>
        </div>
        <Link href="/studio/new" className="rl-btn rl-btn-primary">New program</Link>
      </div>

      {needsHandle && (
        <div className="rl-card" style={{ borderColor: "var(--rl-accent)", gap: "var(--rl-space-2)" }}>
          <span className="t-heading">Pick your handle first</span>
          <span className="c-secondary">Your page will live at runletter.com/c/<b>yourhandle</b>. Set it, your name and a line about you before you publish anything.</span>
          <Link href="/studio/page" className="rl-btn rl-btn-secondary" style={{ alignSelf: "flex-start" }}>Set up your page</Link>
        </div>
      )}

      {programs.length === 0 ? (
        <div className="rl-stack" style={{ gap: "var(--rl-space-4)" }}>
          <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-2)" }}>
            <span className="t-heading">No programs yet</span>
            <span className="c-secondary">Start with the goal and the number of weeks. You can fill in days one at a time and duplicate weeks as you go. Below is what a finished one looks like.</span>
            <Link href="/studio/new" className="rl-btn rl-btn-primary" style={{ alignSelf: "flex-start" }}>Start your first program</Link>
          </div>
          <ProgramCard p={sampleProgram} href={`/studio/programs/${sampleProgram.id}`} example />
        </div>
      ) : (
        <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          {programs.map((p) => <ProgramCard key={p.id} p={p} href={`/studio/programs/${p.id}`} />)}
        </div>
      )}
    </main>
  );
}

function ProgramCard({ p, href, example = false }: { p: Program; href: string; example?: boolean }) {
  return (
    <Link href={href} className="rl-card" style={{ color: "inherit", textDecoration: "none" }}>
      <div className="rl-cover-row">
        <Cover name={coverFor(p)} ratio={4 / 3} />
        <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between">
            <span className="t-heading">{p.title}</span>
            <span className={STATUS_CHIP[p.status]}>{example ? "Example" : p.status}</span>
          </div>
          {p.description && <span className="c-secondary">{p.description}</span>}
          <span className="rl-row">
            <span className="rl-chip">{p.weeks} weeks</span>
            <span className="rl-chip">{p.level}</span>
            <span className="rl-chip">{p.goal}</span>
            <span className="rl-chip">{p.access === "creator_sub" ? "Included" : `$${((p.priceCents ?? 0) / 100).toFixed(0)} one-time`}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
