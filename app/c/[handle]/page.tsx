// Public creator page: /c/:handle. Real profiles from Supabase; "sarah" stays as the example.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mark } from "@/components/ui/Logo";
import { Ink, Portrait } from "@/components/ui/Ink";
import { ProgramCover } from "@/components/run/ProgramCover";
import { getProfileByHandle, listPublishedPrograms, getMyAccess } from "@/lib/db/programs";
import { JoinButton, priceLabel } from "@/components/run/JoinButton";
import { isConfigured } from "@/lib/supabase/server";
import { sampleCreator, sampleProgram } from "@/lib/sample";
import type { Profile, Program } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(handle: string): Promise<{ c: Profile; programs: Program[]; example: boolean } | null> {
  if (handle === sampleCreator.handle) return { c: sampleCreator, programs: [sampleProgram], example: true };
  if (!isConfigured()) return null;
  const c = await getProfileByHandle(handle);
  if (!c) return null;
  return { c, programs: await listPublishedPrograms(c.id), example: false };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const r = await load(handle);
  return { title: r ? r.c.displayName || `@${handle}` : "Creator" };
}

const LINK_LABEL: Record<string, string> = { instagram: "Instagram", strava: "Strava", youtube: "YouTube", tiktok: "TikTok" };

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const r = await load(handle);
  if (!r) notFound();
  const { c, programs, example } = r;
  const letter = programs.find((p) => p.isLetter) ?? null;
  const access = letter && !example ? await getMyAccess(letter) : { signedIn: false, subscribed: false, purchased: false };

  return (
    <main>
      <div className={`rl-atmo ${c.coverUrl ? "rl-atmo-night" : "rl-atmo-dawn"}`} style={{ padding: "var(--rl-space-12) 0", overflow: "hidden", ...(c.coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(20,19,17,.35) 0%, rgba(20,19,17,.85) 100%), url(${c.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
        <div className="rl-page rl-stack" style={{ paddingBlock: 0, gap: "var(--rl-space-4)", position: "relative" }}>
          {!c.coverUrl && <Ink name="pace-group" style={{ position: "absolute", right: "-6%", top: "-10%", width: "min(52%, 300px)", opacity: 0.85, pointerEvents: "none" }} />}
          <Link href="/" className="rl-logo" style={{ color: "inherit" }} aria-label="RunLetter"><Mark size={28} /></Link>
          <div className="rl-row">
            {example ? <Portrait name="sarah" size={64} /> : c.avatarUrl ? <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", flex: "none", border: "2px solid var(--rl-paper-100)" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></span> : <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--rl-ink-900)", color: "var(--rl-paper-100)", display: "grid", placeItems: "center", font: "400 28px/1 var(--rl-font-display)" }}>{(c.displayName || c.handle)[0]?.toUpperCase()}</span>}
            <span className="t-label" style={{ opacity: 0.7 }}>@{c.handle}</span>
          </div>
          <h1 className="t-display-xl" style={{ margin: 0 }}>{c.displayName || `@${c.handle}`}</h1>
          {c.bio && <p className="t-body" style={{ margin: 0, maxWidth: "48ch" }}>{c.bio}</p>}
          <div className="rl-row">
            {letter ? (
              <JoinButton program={letter} creator={c} access={access} back={`/c/${c.handle}`} example={example} className={`rl-btn rl-btn-lg ${c.coverUrl ? "rl-btn-paper" : "rl-btn-ink"}`} />
            ) : example ? (
              <Link href="/signup" className={`rl-btn rl-btn-lg ${c.coverUrl ? "rl-btn-paper" : "rl-btn-ink"}`}>Subscribe · $7/mo</Link>
            ) : null}
            {letter && <span className="rl-help" style={{ color: "inherit", opacity: 0.7 }}>{priceLabel(letter, c) === "Free" ? "The Letter, every week." : "Monthly. Cancel any time."}</span>}
          </div>
          {Object.keys(c.links).length > 0 && (
            <div className="rl-row" style={{ gap: "var(--rl-space-2)" }}>
              {Object.entries(c.links).map(([k, url]) => (
                <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="rl-chip" style={{ color: "inherit" }}>{LINK_LABEL[k] ?? k}</a>
              ))}
            </div>
          )}
        </div>
      </div>
      <section className="rl-page rl-stack" style={{ gap: "var(--rl-space-4)" }}>
        <span className="t-label c-muted">Programs</span>
        {programs.length === 0 ? (
          <div className="rl-card rl-sunken"><span className="c-secondary">No published programs yet. Check back after Sunday.</span></div>
        ) : (
          programs.map((p) => (
            <Link key={p.id} href={`/c/${c.handle}/${p.id}`} className="rl-card" style={{ color: "inherit", textDecoration: "none" }}>
              <ProgramCover p={p} ratio={21 / 9} />
              <span className="t-heading">{p.title}</span>
              {p.description && <span className="c-secondary">{p.description}</span>}
              <span className="rl-row">
                <span className="rl-chip">{p.weeks} weeks</span>
                <span className="rl-chip">{p.level}</span>
                <span className="rl-chip rl-chip-accent">{p.isLetter ? priceLabel(p, c) : p.access === "creator_sub" ? "Included" : priceLabel(p, c)}</span>
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
