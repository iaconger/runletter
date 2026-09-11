"use client";
// The interactive half of the auth screen: the run/create switch changes the headline, the sketch, the name
// placeholder and where you land afterwards, on both sign up and sign in. Password by default; "email me a
// link" swaps the form to the magic link (also the forgot-password path).

import Link from "next/link";
import { useState } from "react";
import { Mark } from "@/components/ui/Logo";
import { Ink } from "@/components/ui/Ink";

export type Mode = "signup" | "signin";
export type Role = "runner" | "creator";

export function AuthFormClient({
  mode,
  action,
  linkAction,
  error,
  next,
  initialRole,
  configured,
}: {
  mode: Mode;
  action: (formData: FormData) => void | Promise<void>;
  linkAction: (formData: FormData) => void | Promise<void>;
  error?: string;
  next?: string;
  initialRole: Role;
  configured: boolean;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [viaLink, setViaLink] = useState(false);
  const signup = mode === "signup";
  const asCreator = role === "creator";
  // If the caller asked for a specific page, keep it; otherwise the switch decides where you land.
  const landing = next || (asCreator ? "/studio" : "/app");
  const other = signup ? `/login?role=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}` : `/signup?as=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  return (
    <>
      <Link href="/" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter home">
        <Mark size={36} />
      </Link>
      <Ink key={role} name={asCreator ? "pace-group" : "stride"} style={{ width: asCreator ? 240 : 200, opacity: 0.85, marginBottom: "calc(-1 * var(--rl-space-3))" }} />
      <form action={viaLink ? linkAction : action} className="rl-stack" style={{ gap: "var(--rl-space-5)" }}>
        <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
          <h1 className="t-display-lg" style={{ margin: 0 }}>
            {signup ? (asCreator ? "Open your studio" : "Start running with them") : asCreator ? "Back to the studio" : "Back to your week"}
          </h1>
          <p className="c-secondary" style={{ margin: 0 }}>
            {viaLink ? "We email you a link, you tap it, you're in." : signup ? "Takes a minute. Your first week takes longer." : "Good to see you."}
          </p>
        </div>

        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={landing} />
        <input type="hidden" name="role" value={role} />

        <div className="rl-row" role="radiogroup" aria-label="I am here to">
          <button type="button" role="radio" aria-checked={!asCreator} className={`rl-chip ${!asCreator ? "rl-chip-on" : ""}`} style={{ cursor: "pointer" }} onClick={() => setRole("runner")}>
            I&rsquo;m here to run
          </button>
          <button type="button" role="radio" aria-checked={asCreator} className={`rl-chip ${asCreator ? "rl-chip-on" : ""}`} style={{ cursor: "pointer" }} onClick={() => setRole("creator")}>
            I&rsquo;m here to create
          </button>
        </div>

        {signup && (
          <div className="rl-field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" className="rl-input" placeholder={asCreator ? "What your followers call you" : "First name is fine"} maxLength={60} autoComplete="name" required />
          </div>
        )}
        <div className="rl-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="rl-input" placeholder="you@example.com" autoComplete="email" required autoFocus={!signup} />
        </div>
        {!viaLink && (
          <div className="rl-field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="rl-input" placeholder={signup ? "At least 8 characters" : "Your password"} minLength={8} autoComplete={signup ? "new-password" : "current-password"} required />
          </div>
        )}
        {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
        <button type="submit" className="rl-btn rl-btn-primary rl-btn-lg">
          {viaLink ? "Email me a link" : signup ? (asCreator ? "Create my studio" : "Create my account") : "Sign in"}
        </button>
        <p className="rl-help" style={{ margin: 0 }}>
          {viaLink ? (
            <>Prefer a password? <button type="button" className="rl-linkbtn" onClick={() => setViaLink(false)}>Go back</button>.</>
          ) : signup ? (
            <>Or <button type="button" className="rl-linkbtn" onClick={() => setViaLink(true)}>email me a sign-in link</button> instead.</>
          ) : (
            <>Forgot it? <button type="button" className="rl-linkbtn" onClick={() => setViaLink(true)}>Email me a sign-in link</button>.</>
          )}
        </p>
        <p className="rl-help" style={{ margin: 0 }}>
          {signup ? <>Already have an account? <Link href={other}>Sign in</Link>.</> : <>New here? <Link href={other}>Create an account</Link>.</>}
          {signup && <> By continuing you agree this is a beta and things will change.</>}
        </p>
        {!configured && <span className="rl-help">Sign-in is not configured in this environment.</span>}
      </form>
    </>
  );
}
