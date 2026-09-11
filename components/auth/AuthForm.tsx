// One form, two doors. Magic link either way (no passwords), but sign-up asks for a name and which side you're on,
// and the copy says "create", because "sign in" to an account you don't have is a wall.
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Mark } from "@/components/ui/Logo";
import { Ink } from "@/components/ui/Ink";
import { createClient, isConfigured } from "@/lib/supabase/server";

export type Mode = "signup" | "signin";

async function sendLink(formData: FormData) {
  "use server";
  const mode = (String(formData.get("mode")) === "signin" ? "signin" : "signup") as Mode;
  const path = mode === "signin" ? "/login" : "/signup";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const role = String(formData.get("role") ?? "runner") === "creator" ? "creator" : "runner";
  const next = String(formData.get("next") ?? "") || (role === "creator" ? "/studio" : "/app");
  const q = new URLSearchParams({ next, role });
  if (!email) redirect(`${path}?${q}&error=${encodeURIComponent("Enter your email")}`);
  if (!isConfigured()) redirect(`${path}?${q}&error=${encodeURIComponent("Sign-in is not configured yet")}`);

  const supabase = await createClient();
  // The link in the email must come back to wherever this form was served from. Prefer the request's own
  // origin (Render sets x-forwarded-*), then the configured URL, then localhost for dev.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
      data: name ? { display_name: name, role } : { role },
    },
  });
  if (error) redirect(`${path}?${q}&error=${encodeURIComponent(error.message)}`);
  redirect(`${path}?${q}&sent=${encodeURIComponent(email)}`);
}

export function AuthForm({ mode, sent, error, next, role }: { mode: Mode; sent?: string; error?: string; next?: string; role?: string }) {
  const signup = mode === "signup";
  const asCreator = role === "creator";
  return (
    <main className="rl-page rl-stack" style={{ maxWidth: 440, minHeight: "100vh", justifyContent: "center", gap: "var(--rl-space-6)" }}>
      <Link href="/" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter home">
        <Mark size={36} />
      </Link>
      <Ink name={asCreator ? "pace-group" : "stride"} style={{ width: asCreator ? 240 : 200, opacity: 0.85, marginBottom: "calc(-1 * var(--rl-space-3))" }} />
      {sent ? (
        <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
          <h1 className="t-display-lg" style={{ margin: 0 }}>Check your email.</h1>
          <p className="c-secondary" style={{ margin: 0 }}>
            We sent a link to <b>{sent}</b>. Tap it and you&rsquo;re in. It expires in an hour.
          </p>
          <p className="rl-help">No email? Check spam, or <Link href={signup ? "/signup" : "/login"}>try again</Link>.</p>
        </div>
      ) : (
        <form action={sendLink} className="rl-stack" style={{ gap: "var(--rl-space-5)" }}>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
            <h1 className="t-display-lg" style={{ margin: 0 }}>
              {signup ? (asCreator ? "Open your studio" : "Start running with them") : "Welcome back"}
            </h1>
            <p className="c-secondary" style={{ margin: 0 }}>
              {signup ? "No password to invent. We email you a link, you tap it, done." : "No password. We email you a link."}
            </p>
          </div>
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="next" value={next ?? ""} />
          {signup && (
            <>
              <div className="rl-row" role="radiogroup" aria-label="I am here to">
                <label className={`rl-chip ${!asCreator ? "rl-chip-on" : ""}`} style={{ cursor: "pointer" }}>
                  <input type="radio" name="role" value="runner" defaultChecked={!asCreator} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                  I&rsquo;m here to run
                </label>
                <label className={`rl-chip ${asCreator ? "rl-chip-on" : ""}`} style={{ cursor: "pointer" }}>
                  <input type="radio" name="role" value="creator" defaultChecked={asCreator} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                  I make plans
                </label>
              </div>
              <div className="rl-field">
                <label htmlFor="name">Your name</label>
                <input id="name" name="name" className="rl-input" placeholder={asCreator ? "What your followers call you" : "First name is fine"} maxLength={60} autoComplete="name" required />
              </div>
            </>
          )}
          <div className="rl-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="rl-input" placeholder="you@example.com" autoComplete="email" required autoFocus={!signup} />
            {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
          </div>
          <button type="submit" className="rl-btn rl-btn-primary rl-btn-lg">{signup ? "Create my account" : "Email me a link"}</button>
          <p className="rl-help" style={{ margin: 0 }}>
            {signup ? <>Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link>.</> : <>New here? <Link href="/signup">Create an account</Link>.</>}
            {signup && <> By continuing you agree this is a beta and things will change.</>}
          </p>
          {!isConfigured() && <span className="rl-help">Sign-in is not configured in this environment.</span>}
        </form>
      )}
    </main>
  );
}
