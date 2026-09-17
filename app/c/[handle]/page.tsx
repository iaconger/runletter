// Public creator page: /c/:handle. Real profiles from Supabase; "sarah" stays as the example.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mark } from "@/components/ui/Logo";
import { Ink, Portrait } from "@/components/ui/Ink";
import { ProgramCover } from "@/components/run/ProgramCover";
import { getProfileByHandle, listPublishedPrograms, getMyAccess, listShoes, listCreatorFollowers, getCreatorWeek } from "@/lib/db/programs";
import { dayTitle } from "@/components/run/RunPieces";
import { RUN_TYPE_LABEL, addDays, dayDurationS, toISODate } from "@/lib/types";
import { demoCreator, demoCrewFor, demoPrograms, demoProfile, demoShoesFor, demoWeekFor, type DemoCreator } from "@/lib/demo";
import { mondayOf } from "@/lib/calendar";
import { JoinButton, priceLabel } from "@/components/run/JoinButton";
import { Price } from "@/components/ui/Price";
import { PickedRotation, Rotation, shoesOf } from "@/components/studio/Rotation";
import { isConfigured } from "@/lib/supabase/server";
import { sampleCreator, sampleProgram } from "@/lib/sample";
import type { Profile, Program } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(handle: string): Promise<{ c: Profile; programs: Program[]; example: boolean; demo: DemoCreator | null } | null> {
  // A made-up creator, so the page can be shown to somebody with nothing in their account yet.
  const d = demoCreator(handle);
  if (d) return { c: demoProfile(d), programs: demoPrograms(d, mondayOf(toISODate(new Date()))), example: true, demo: d };
  if (handle === sampleCreator.handle) return { c: sampleCreator, programs: [sampleProgram], example: true, demo: null };
  if (!isConfigured()) return null;
  const c = await getProfileByHandle(handle);
  if (!c) return null;
  return { c, programs: await listPublishedPrograms(c.id), example: false, demo: null };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const r = await load(handle);
  return { title: r ? r.c.displayName || `@${handle}` : "Creator" };
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LINK_LABEL: Record<string, string> = { instagram: "Instagram", strava: "Strava", youtube: "YouTube", tiktok: "TikTok" };

export default async function CreatorPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ demo?: string }> }) {
  const { handle } = await params;
  const { demo } = await searchParams;
  const r = await load(handle);
  if (!r) notFound();
  const { c, programs, example, demo: dc } = r;
  const letter = programs.find((p) => p.isLetter) ?? null;
  const access = letter && !example ? await getMyAccess(letter) : { signedIn: false, subscribed: false, purchased: false };
  const preview = demo === "1" || example;
  const realPicked = example ? [] : await listShoes(c.id);
  const realCrew = example ? [] : await listCreatorFollowers(c.id);
  const realWeek = example ? null : await getCreatorWeek(c.id);
  // Made-up data on the sample creator, or with ?demo=1, so the page can be judged before it fills up.
  const who = dc?.handle ?? "sarah";
  const picked = preview && realPicked.length === 0 ? (demoShoesFor(who) as unknown as typeof realPicked) : realPicked;
  const crew = preview && realCrew.length === 0 ? (demoCrewFor(who, dc ? 14 : 8) as unknown as typeof realCrew) : realCrew;
  const thisWeek = preview && (!realWeek || realWeek.days.length === 0)
    ? { programId: "demo", title: "This week", week: 1, weekStart: mondayOf(toISODate(new Date())), isLetter: true, days: demoWeekFor(who, mondayOf(toISODate(new Date()))) }
    : realWeek;

  return (
    <main>
      <div className={`rl-atmo ${c.coverUrl ? "rl-atmo-night" : "rl-atmo-dawn"}`} style={{ padding: "var(--rl-space-12) 0", overflow: "hidden", ...(c.coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(20,19,17,.35) 0%, rgba(20,19,17,.85) 100%), url(${c.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
        <div className="rl-page rl-stack" style={{ paddingBlock: 0, gap: "var(--rl-space-4)", position: "relative" }}>
          {!c.coverUrl && <Ink name="pace-group" style={{ position: "absolute", right: "-6%", top: "-10%", width: "min(52%, 300px)", opacity: 0.85, pointerEvents: "none" }} />}
          <Link href="/" className="rl-logo" style={{ color: "inherit" }} aria-label="RunLetter"><Mark size={28} /></Link>
          <div className="rl-row">
            {example && !dc ? <Portrait name="sarah" size={64} /> : c.avatarUrl ? <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", flex: "none", border: "2px solid var(--rl-paper-100)" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></span> : <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--rl-ink-900)", color: "var(--rl-paper-100)", display: "grid", placeItems: "center", font: "400 28px/1 var(--rl-font-display)" }}>{(c.displayName || c.handle)[0]?.toUpperCase()}</span>}
            <span className="t-label" style={{ opacity: 0.7 }}>@{c.handle}</span>
          </div>
          <h1 className="t-display-xl" style={{ margin: 0 }}>{c.displayName || `@${c.handle}`}</h1>
          {c.bio && <p className="t-body" style={{ margin: 0, maxWidth: "48ch" }}>{c.bio}</p>}
          <div className="rl-row">
            {letter ? (
              <JoinButton program={letter} creator={c} access={access} back={`/c/${c.handle}`} example={example} className="rl-btn rl-btn-lg rl-btn-neon" />
            ) : example ? (
              <Link href="/signup" className="rl-btn rl-btn-lg rl-btn-neon">Subscribe · $7/mo</Link>
            ) : null}
            {letter && <span className="rl-help" style={{ color: "inherit", opacity: 0.7 }}>{priceLabel(letter, c) === "Free" ? "A new week, every week." : "Monthly. Cancel any time."}</span>}
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
      {thisWeek && thisWeek.days.length > 0 && (
        <section className="rl-page rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "var(--rl-space-2)" }}>
            <div className="rl-stack" style={{ gap: 2 }}>
              <span className="t-label c-muted rl-kicker">What {c.displayName.split(" ")[0]} is running</span>
              <h2 className="t-title" style={{ margin: 0 }}>This week</h2>
            </div>
            {!access.subscribed && !access.purchased && (
              <span className="rl-help">Subscribe to get these on your own watch.</span>
            )}
          </div>
          <ol className="rl-publicweek">
            {Array.from({ length: 7 }, (_, i) => {
              const d = thisWeek.days.find((x) => x.day === i + 1) ?? null;
              const date = toISODate(addDays(thisWeek.weekStart, i));
              const mins = d && d.kind === "run" ? Math.round(dayDurationS(d) / 60) : 0;
              const open = access.subscribed || access.purchased || access.own;
              return (
                <li key={i} data-run={d ? (d.kind === "run" ? d.runType ?? "easy" : d.kind) : undefined}>
                  <span className="dy">{DAYS_SHORT[i]}<i>{Number(date.slice(8, 10))}</i></span>
                  <span className="wh">
                    {!d ? <span className="c-muted">–</span> : d.kind === "rest" ? "Rest" : d.kind === "cross" ? "Cross training"
                      : <>{d.runType ? RUN_TYPE_LABEL[d.runType] : "Run"}{open && mins ? <em> · {mins} min</em> : null}</>}
                  </span>
                  {d?.note && <span className="nt">{d.note}</span>}
                  {d?.kind === "run" && (open
                    ? <Link href={`/app/run/${d.id}`} className="go">Open →</Link>
                    : <span className="go locked">Subscribers</span>)}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {crew.length > 0 && (
        <section className="rl-page rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <div className="rl-between" style={{ alignItems: "baseline" }}>
            <span className="t-label c-muted">Running with {c.displayName.split(" ")[0]}</span>
            <span className="rl-help">{dc ? `${dc.runners.toLocaleString()} runners` : `${crew.length}${crew.length === 24 ? "+" : ""} ${crew.length === 1 ? "runner" : "runners"}`}</span>
          </div>
          <ul className="rl-crewfaces">
            {crew.map((f) => (
              <li key={f.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.avatarUrl ? <img src={f.avatarUrl} alt="" loading="lazy" /> : <span className="ini">{(f.name || f.handle)[0]?.toUpperCase()}</span>}
                <span className="nm">{(f.name || f.handle).split(" ")[0]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(picked.length > 0 || shoesOf(c.stravaGear).length > 0) && (
        <section className="rl-page rl-stack" style={{ gap: "var(--rl-space-4)" }}>
          {picked.length > 0
            ? <PickedRotation shoes={picked} units={c.units} />
            : <Rotation shoes={shoesOf(c.stravaGear)} units={c.units} />}
        </section>
      )}
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
                {!p.isLetter && p.access === "creator_sub" ? <span className="rl-chip">Included</span> : <Price cents={p.priceCents} per={p.isLetter ? "mo" : undefined} size="sm" />}
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
