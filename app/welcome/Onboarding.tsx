"use client";
// Three steps after the magic link: who you are, where people find you, what you look like.
// Each step saves on its own so nothing is lost if they bail halfway.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_SPEC, prepareImage } from "@/lib/image";
import { saveIdentityAction, saveImagesAction, saveSocialsAction } from "./actions";
import type { Profile } from "@/lib/types";
import { RunningForm } from "@/components/run/RunningForm";

const SOCIALS: { key: string; label: string; prefix: string; hint: string }[] = [
  { key: "instagram", label: "Instagram", prefix: "instagram.com/", hint: "yourname" },
  { key: "strava", label: "Strava", prefix: "strava.com/athletes/", hint: "your athlete id or name" },
  { key: "youtube", label: "YouTube", prefix: "youtube.com/@", hint: "channel" },
  { key: "tiktok", label: "TikTok", prefix: "tiktok.com/@", hint: "yourname" },
];

function usernameFrom(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/^https?:\/\/(www\.)?[^/]+\//, "").replace(/^(athletes\/|@)/, "").replace(/\/.*$/, "");
}

type StepKey = "you" | "socials" | "running" | "photo" | "connect";
const STEP_LABEL: Record<StepKey, string> = { you: "You", socials: "Socials", running: "Running", photo: "Photo", connect: "Connect" };

export function Onboarding({ profile, userId, next, role, startStep = "you", stravaConnected = false }: { profile: Profile; userId: string; next: string; role: "creator" | "runner"; startStep?: StepKey; stravaConnected?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>(startStep);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isCreator = role === "creator" || profile.isCreator;

  // step 1
  const [handle, setHandle] = useState(profile.handle.startsWith("u_") ? "" : profile.handle);
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  // step 2
  const [socials, setSocials] = useState<Record<string, string>>(Object.fromEntries(SOCIALS.map((s) => [s.key, usernameFrom(profile.links[s.key])])));
  // step 3
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [coverUrl, setCoverUrl] = useState<string | null>(profile.coverUrl);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  // Runners get one extra screen: what they run for, days a week, 5K time. Skippable.
  const steps: StepKey[] = isCreator ? ["you", "socials", "photo", "connect"] : ["you", "socials", "running", "photo", "connect"];
  const after = (k: StepKey): StepKey => steps[Math.min(steps.indexOf(k) + 1, steps.length - 1)]!;
  const stepIndex = steps.indexOf(step);

  function go(fn: () => Promise<{ ok: boolean; error?: string }>, then: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "Something went wrong");
      then();
    });
  }

  async function upload(kind: "avatar" | "cover", file: File) {
    setUploading(kind);
    setError(null);
    try {
      const supabase = createClient();
      const { blob, ext, type } = await prepareImage(file, kind === "avatar" ? IMAGE_SPEC.avatar : IMAGE_SPEC.cover);
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      const r = await saveImagesAction(kind === "avatar" ? { avatarUrl: url } : { coverUrl: url });
      if (!r.ok) throw new Error(r.error);
      if (kind === "avatar") setAvatarUrl(url);
      else setCoverUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  const finish = () => router.push(next || (isCreator ? "/studio" : "/app"));

  return (
    <div className="rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <ol className="rl-row" style={{ listStyle: "none", margin: 0, padding: 0, gap: "var(--rl-space-2)" }} aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} className={`rl-chip ${i === stepIndex ? "rl-chip-on" : i < stepIndex ? "rl-chip-success" : ""}`}>{i + 1}. {isCreator && s === "photo" ? "Photos" : STEP_LABEL[s]}</li>
        ))}
      </ol>

      {step === "you" && (
        <form className="rl-stack" style={{ gap: "var(--rl-space-5)" }} onSubmit={(e) => { e.preventDefault(); go(() => saveIdentityAction({ handle, displayName: name, bio, isCreator }), () => setStep("socials")); }}>
          <div className="rl-stack" style={{ gap: 4 }}>
            <h1 className="t-display-lg" style={{ margin: 0 }}>{isCreator ? "Your page starts here." : "First, the basics."}</h1>

          </div>
          <div className="rl-field">
            <label htmlFor="handle">Handle</label>
            <div className="rl-row" style={{ gap: 6, flexWrap: "nowrap" }}>
              <span className="c-muted" style={{ whiteSpace: "nowrap" }}>runletter.com/c/</span>
              <input id="handle" className="rl-input" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24))} placeholder="yourname" required minLength={3} autoFocus />
            </div>

          </div>
          <div className="rl-field">
            <label htmlFor="name">Name</label>
            <input id="name" className="rl-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder={isCreator ? "What your followers call you" : "Your name"} />
          </div>
          <div className="rl-field">
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" className="rl-input" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Optional" />
          </div>
          {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
          <button type="submit" className="rl-btn rl-btn-primary rl-btn-lg" disabled={pending} style={{ alignSelf: "flex-start" }}>{pending ? "Saving…" : "Continue"}</button>
        </form>
      )}

      {step === "socials" && (
        <form className="rl-stack" style={{ gap: "var(--rl-space-5)" }} onSubmit={(e) => { e.preventDefault(); go(() => saveSocialsAction(socials), () => setStep(after("socials"))); }}>
          <div className="rl-stack" style={{ gap: 4 }}>
            <h1 className="t-display-lg" style={{ margin: 0 }}>Where do people find you?</h1>
            <p className="c-secondary" style={{ margin: 0 }}>Usernames only.</p>
          </div>
          {SOCIALS.map((s) => (
            <div key={s.key} className="rl-field">
              <label htmlFor={s.key}>{s.label}</label>
              <div className="rl-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                <span className="c-muted" style={{ whiteSpace: "nowrap", fontSize: 14 }}>{s.prefix}</span>
                <input id={s.key} className="rl-input" value={socials[s.key] ?? ""} onChange={(e) => setSocials({ ...socials, [s.key]: e.target.value.replace(/^@/, "") })} placeholder={s.hint} autoCapitalize="none" autoCorrect="off" />
              </div>
            </div>
          ))}
          {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
          <div className="rl-row">
            <button type="submit" className="rl-btn rl-btn-primary rl-btn-lg" disabled={pending}>{pending ? "Saving…" : "Continue"}</button>
            <button type="button" className="rl-btn rl-btn-ghost rl-btn-lg" onClick={() => setStep(after("socials"))}>Skip</button>
          </div>
        </form>
      )}

      {step === "running" && (
        <div className="rl-stack" style={{ gap: "var(--rl-space-5)" }}>
          <div className="rl-stack" style={{ gap: 4 }}>
            <h1 className="t-display-lg" style={{ margin: 0 }}>What are you running for?</h1>
          </div>
          <RunningForm profile={profile} onDone={() => setStep("photo")} onSkip={() => setStep("photo")} />
        </div>
      )}

      {step === "photo" && (
        <div className="rl-stack" style={{ gap: "var(--rl-space-5)" }}>
          <div className="rl-stack" style={{ gap: 4 }}>
            <h1 className="t-display-lg" style={{ margin: 0 }}>{isCreator ? "Put a face on it." : "Add a photo."}</h1>

          </div>

          <div className="rl-row" style={{ alignItems: "center", gap: "var(--rl-space-4)" }}>
            <span aria-hidden="true" style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden", background: "var(--rl-surface-sunken)", border: "var(--rl-border-hairline) solid var(--rl-hairline)", flex: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {avatarUrl && <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </span>
            <div className="rl-stack" style={{ gap: 6 }}>
              <span className="t-body-medium">Profile photo</span>
              <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload("avatar", e.target.files[0])} />
              <button type="button" className="rl-btn rl-btn-secondary rl-btn-sm" onClick={() => avatarInput.current?.click()} disabled={uploading !== null}>{uploading === "avatar" ? "Uploading…" : avatarUrl ? "Replace" : "Choose photo"}</button>
            </div>
          </div>

          {isCreator && (
            <div className="rl-stack" style={{ gap: 6 }}>
              <span className="t-body-medium">Cover photo</span>
              <div style={{ aspectRatio: "21 / 9", borderRadius: "var(--rl-radius-md)", overflow: "hidden", background: "var(--rl-surface-sunken)", border: "var(--rl-border-hairline) solid var(--rl-hairline)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {coverUrl && <img src={coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </div>
              <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload("cover", e.target.files[0])} />
              <button type="button" className="rl-btn rl-btn-secondary rl-btn-sm" onClick={() => coverInput.current?.click()} disabled={uploading !== null} style={{ alignSelf: "flex-start" }}>{uploading === "cover" ? "Uploading…" : coverUrl ? "Replace" : "Choose cover"}</button>
              <span className="rl-help">Wide. Optional.</span>
            </div>
          )}

          {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
          <div className="rl-row">
            <button type="button" className="rl-btn rl-btn-primary rl-btn-lg" onClick={() => setStep("connect")} disabled={uploading !== null}>Continue</button>
            <button type="button" className="rl-btn rl-btn-ghost rl-btn-lg" onClick={() => setStep("connect")}>Skip</button>
          </div>
        </div>
      )}

      {step === "connect" && (
        <div className="rl-stack" style={{ gap: "var(--rl-space-4)" }}>
          <div className="rl-connect-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/photo/situations/connect.webp" alt="" />
            <div className="body">
              <h1 className="t-display-lg" style={{ margin: 0 }}>Your watch. Your Strava. One tap.</h1>
              <p style={{ margin: 0, opacity: 0.85, maxWidth: "36ch" }}>RunLetter isn&rsquo;t where you run. Runs go to your watch; finished runs come back from Strava.</p>
            </div>
          </div>
          <div className="rl-stack" style={{ gap: 8 }}>
            <a href={`/api/connect/strava?back=${encodeURIComponent(`/welcome?role=${role}&next=${encodeURIComponent(next)}&step=connect&connected=strava`)}`} className="rl-btn rl-btn-lg rl-btn-strava" style={{ justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/partners/strava-96.png" alt="" width={20} height={20} style={{ borderRadius: 5 }} />
              {stravaConnected ? "Strava connected" : "Connect with Strava"}
            </a>
            <div className="rl-between rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "10px 12px" }}>
              <span className="t-body-sm">Garmin</span><span className="rl-chip">Coming</span>
            </div>
            <div className="rl-between rl-sunken" style={{ borderRadius: "var(--rl-radius-md)", padding: "10px 12px" }}>
              <span className="t-body-sm">COROS</span><span className="rl-chip">File import</span>
            </div>
          </div>
          <div className="rl-row">
            <button type="button" className="rl-btn rl-btn-primary rl-btn-lg" onClick={finish}>{isCreator ? "Open the studio" : "See today"}</button>
            {!stravaConnected && <button type="button" className="rl-btn rl-btn-ghost rl-btn-lg" onClick={finish}>Later</button>}
          </div>
        </div>
      )}
    </div>
  );
}
