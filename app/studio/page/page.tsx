// "Your page": handle, name, bio, links. What /c/:handle shows.
import { Connections } from "@/components/connections/Connections";
import { UnitsCard } from "@/components/ui/UnitsCard";
import Link from "next/link";
import { updateProfileAction } from "@/app/studio/actions";
import { getMyLetter, getMyProfile, listShoes } from "@/lib/db/programs";
import { GetPaid } from "@/components/studio/GetPaid";
import { ProfilePhotos } from "@/components/studio/ProfilePhotos";
import { Shoe, shoesOf } from "@/components/studio/Rotation";
import { ShoePicker } from "@/components/studio/ShoePicker";
import { addShoeAction, removeShoeAction } from "@/app/studio/actions";
import { brandName, colourValue } from "@/lib/shoes/catalog";
import { distanceLabel, fmtDistance } from "@/lib/units";
import { isConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Your page" };
export const dynamic = "force-dynamic";

export default async function YourPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; connected?: string; stripe?: string }> }) {
  const { error, saved, connected, stripe } = await searchParams;
  const [profile, letter] = isConfigured() ? await Promise.all([getMyProfile(), getMyLetter()]) : [null, null];
  const myShoes = profile ? await listShoes(profile.id) : [];
  const stravaPairs = shoesOf(profile?.stravaGear).map((g) => ({ id: g.id, label: [g.brand, g.model].filter(Boolean).join(" ") || g.name, distanceM: g.distanceM }));
  const handle = profile && !profile.handle.startsWith("u_") ? profile.handle : "";
  return (
    <main className="rl-page rl-stack" style={{ maxWidth: 640, gap: "var(--rl-space-6)" }}>
      <div className="rl-between">
        <div className="rl-stack" style={{ gap: 2 }}>
          <span className="t-label c-muted">Your page</span>
          <h1 className="t-display-lg" style={{ margin: 0 }}>What followers see first</h1>
        </div>
        {handle && <Link href={`/c/${handle}`} className="rl-btn rl-btn-secondary">View page →</Link>}
      </div>
      {profile && <ProfilePhotos userId={profile.id} avatarUrl={profile.avatarUrl} coverUrl={profile.coverUrl} />}

      {profile && (
        <section className="rl-card" style={{ gap: "var(--rl-space-3)" }} aria-label="Shoes">
          <div className="rl-stack" style={{ gap: 2 }}>
            <span className="t-label c-muted">What you run in</span>
            <span className="t-heading">Your shoes</span>
          </div>

          {myShoes.length > 0 && (
            <ul className="rl-shoepick">
              {myShoes.map((sh) => (
                <li key={sh.id}>
                  <form action={removeShoeAction}>
                    <input type="hidden" name="id" value={sh.id} />
                    <button type="submit" title="Take this pair off your page">
                      <Shoe size={18} tint={colourValue(sh.colour)} />
                      <span className="nm">{brandName(sh.brand)} {sh.model}</span>
                      <span className="km">{sh.distanceM > 0 ? `${fmtDistance(sh.distanceM, profile.units, { decimals: 0 })} ${distanceLabel(profile.units)}` : "new"}</span>
                      <span className="st">Remove</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <ShoePicker add={addShoeAction} stravaPairs={stravaPairs} />
          <span className="rl-help">
            {stravaPairs.length > 0
              ? "Pick a pair and it shows on your page. Link it to a Strava pair and the mileage comes too."
              : "Pick what you run in. Connect Strava below and a pair can carry its mileage with it."}
          </span>
        </section>
      )}

      <form action={updateProfileAction} className="rl-stack" style={{ gap: "var(--rl-space-5)" }}>
        <div className="rl-field">
          <label htmlFor="handle">Handle</label>
          <div className="rl-row" style={{ gap: 6, flexWrap: "nowrap" }}>
            <span className="c-muted" style={{ whiteSpace: "nowrap" }}>runletter.com/c/</span>
            <input id="handle" name="handle" className="rl-input" defaultValue={handle} placeholder="yourname" pattern="[a-z0-9_]{3,24}" required />
          </div>
          <span className="rl-help">Lowercase letters, numbers, underscores. This is the link that goes in your bio, so pick it once.</span>
        </div>
        <div className="rl-field">
          <label htmlFor="displayName">Name</label>
          <input id="displayName" name="displayName" className="rl-input" defaultValue={profile?.displayName ?? ""} maxLength={60} required />
        </div>
        <div className="rl-field">
          <label htmlFor="bio">One line about you</label>
          <textarea id="bio" name="bio" className="rl-input" defaultValue={profile?.bio ?? ""} maxLength={500} placeholder="Marathoner, coach, and the person who will make you do your long run. Chicago." />
          <span className="rl-help">Where you run, what you run, why anyone should follow. Two sentences is plenty.</span>
        </div>
        <div className="rl-stack" style={{ gap: "var(--rl-space-3)" }}>
          <span className="t-label c-muted">Links</span>
          {(["instagram", "strava", "youtube", "tiktok"] as const).map((k) => (
            <div key={k} className="rl-field">
              <label htmlFor={k}>{k[0].toUpperCase() + k.slice(1)}</label>
              <input id={k} name={k} type="url" className="rl-input" defaultValue={profile?.links?.[k] ?? ""} placeholder={`https://${k}.com/…`} />
            </div>
          ))}
        </div>
        {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
        {saved && <span className="rl-help" role="status" style={{ color: "var(--rl-success)" }}>Saved.</span>}
        <button type="submit" className="rl-btn rl-btn-primary rl-btn-lg" style={{ alignSelf: "flex-start" }}>Save page</button>
      </form>
      {profile && <GetPaid userId={profile.id} letterPriceCents={letter?.priceCents ?? null} notice={{ stripe, error: stripe ? undefined : error }} />}
      {profile && <UnitsCard units={profile.units} />}
      <Connections back="/studio/page" notice={{ connected }} />
    </main>
  );
}
