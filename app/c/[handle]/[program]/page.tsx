// Public program page: /c/:handle/:program. The sales page. Shows the first week the viewer is allowed to see.
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockBar } from "@/components/run/BlockBar";
import { ProgramCover } from "@/components/run/ProgramCover";
import { CreatorNote, WeekStrip, dayTitle } from "@/components/run/RunPieces";
import { getProfileByHandle, getProgram, getMyAccess, listPublishedPrograms } from "@/lib/db/programs";
import { JoinButton } from "@/components/run/JoinButton";
import { isConfigured } from "@/lib/supabase/server";
import { sampleCreator, sampleProgram } from "@/lib/sample";
import { dayDurationS, fmtMinutes, type Profile, type Program } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(handle: string, id: string): Promise<{ c: Profile; p: Program } | null> {
  if (handle === sampleCreator.handle && id === sampleProgram.id) return { c: sampleCreator, p: sampleProgram };
  if (!isConfigured()) return null;
  const [c, p] = await Promise.all([getProfileByHandle(handle), getProgram(id)]);
  if (!c || !p || p.creatorId !== c.id || p.status !== "published") return null;
  return { c, p };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string; program: string }> }) {
  const { handle, program } = await params;
  const r = await load(handle, program);
  return { title: r?.p.title ?? "Program" };
}

export default async function ProgramPage({ params }: { params: Promise<{ handle: string; program: string }> }) {
  const { handle, program } = await params;
  const r = await load(handle, program);
  if (!r) notFound();
  const { c, p } = r;
  const example = c.id === sampleCreator.id;
  // A plan "included for subscribers" is joined through the creator's Letter.
  const letter = !example && p.access === "creator_sub" && !p.isLetter ? (await listPublishedPrograms(c.id)).find((x) => x.isLetter) ?? null : null;
  const target = letter ?? p;
  const access = example ? { signedIn: false, subscribed: false, purchased: false } : await getMyAccess(target);
  const firstWeek = p.days.length ? Math.min(...p.days.map((d) => d.week)) : 1;
  const week = p.days.filter((d) => d.week === firstWeek);
  const preview = week.find((d) => d.runType === "tempo" || d.runType === "intervals") ?? week.find((d) => d.kind === "run");
  const runsPerWeek = week.filter((d) => d.kind === "run").length;

  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-8)" }}>
      <ProgramCover p={p} ratio={21 / 9} />
      <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
        <Link href={`/c/${handle}`} className="t-label">← {c.displayName || `@${c.handle}`}</Link>
        <h1 className="t-display-xl" style={{ margin: 0 }}>{p.title}</h1>
        {p.description && <p className="c-secondary" style={{ margin: 0 }}>{p.description}</p>}
        <div className="rl-row">
          <span className="rl-chip">{p.weeks} weeks</span>
          <span className="rl-chip">{p.level}</span>
          {runsPerWeek > 0 && <span className="rl-chip">{runsPerWeek} runs / week</span>}
          <span className="rl-chip rl-chip-human">Written by {c.displayName || c.handle}, not AI</span>
        </div>
      </div>
      {week.length > 0 ? (
        <>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
            <span className="t-label c-muted">Week {firstWeek}</span>
            <WeekStrip days={week} />
          </div>
          {preview && (
            <div className="rl-card">
              <span className="t-label c-muted">A day from the program</span>
              <h2 className="t-title" style={{ margin: 0 }}>{dayTitle(preview)}</h2>
              <span className="t-numeral-lg">{fmtMinutes(dayDurationS(preview))}</span>
              <BlockBar blocks={preview.blocks} />
              <CreatorNote note={preview.note} by={c.displayName || `@${c.handle}`} />
            </div>
          )}
        </>
      ) : (
        <div className="rl-card rl-sunken"><span className="c-secondary">Subscribe to see the weeks. The plan is {p.weeks} weeks long.</span></div>
      )}
      <JoinButton program={target} creator={c} access={access} back={`/c/${handle}/${p.id}`} example={example} />
    </main>
  );
}
