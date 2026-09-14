// One form, two doors. Email and password by default; a magic link as the "forgot password" path.
// Sign-up asks for a name and which side you're on, and the copy says "create", because "sign in"
// to an account you don't have is a wall.
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identify, track } from "@/lib/analytics";
import { Mark } from "@/components/ui/Logo";
import { createClient, isConfigured } from "@/lib/supabase/server";

import { AuthFormClient, type Mode, type Role } from "./AuthFormClient";

export type { Mode };

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

async function withPassword(formData: FormData) {
  "use server";
  const mode = (String(formData.get("mode")) === "signin" ? "signin" : "signup") as Mode;
  const path = mode === "signin" ? "/login" : "/signup";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const role = String(formData.get("role") ?? "runner") === "creator" ? "creator" : "runner";
  const next = String(formData.get("next") ?? "") || (role === "creator" ? "/studio" : "/app");
  const q = new URLSearchParams({ next, role });
  const fail = (msg: string) => redirect(`${path}?${q}&error=${encodeURIComponent(msg)}`);
  if (!email) fail("Enter your email");
  if (password.length < 8) fail("Password needs at least 8 characters");
  if (!isConfigured()) fail("Sign-in is not configured yet");

  const supabase = await createClient();
  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: name ? { display_name: name, role } : { role } } });
    if (error) fail(/already registered/i.test(error.message) ? "That email already has an account. Sign in, or use another email: runner and creator accounts are separate." : error.message);
    // With email confirmation off (build phase) there is a session right away. With it on, they get an email.
    if (data.user) {
      if (data.session) await supabase.from("profiles").update({ is_creator: role === "creator" }).eq("id", data.user.id);
      identify(data.user.id, { role });
      track("signup_completed", { role, method: "password" }, data.user.id);
    }
    if (!data.session) redirect(`${path}?${q}&sent=${encodeURIComponent(email)}`);
    redirect(`/welcome?next=${encodeURIComponent(next)}&role=${role}`);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) fail(error && !/invalid/i.test(error.message) ? error.message : "Wrong email or password.");
  const { data: profile } = await supabase.from("profiles").select("handle, is_creator").eq("id", data.user!.id).maybeSingle();
  const kind = profile?.is_creator ? "creator" : "runner";
  const home = kind === "creator" ? "/studio" : "/app";
  if (profile && profile.handle.startsWith("u_")) redirect(`/welcome?next=${encodeURIComponent(home)}&role=${kind}`);
  const wanted = next.startsWith("/") && !next.startsWith("//") ? next : home;
  // The switch on the form is a hint; the account decides. A runner can't land in the studio and vice versa.
  const allowed = kind === "creator" ? !wanted.startsWith("/app") : !wanted.startsWith("/studio");
  redirect(allowed ? wanted : home);
}

export function AuthForm({ mode, sent, error, next, role }: { mode: Mode; sent?: string; error?: string; next?: string; role?: string }) {
  const signup = mode === "signup";
  const initialRole: Role = role === "creator" ? "creator" : "runner";
  return (
    <main className="rl-page rl-stack" style={{ maxWidth: 440, minHeight: "100vh", justifyContent: "center", gap: "var(--rl-space-6)" }}>
      {sent ? (
        <>
          <Link href="/" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter home">
            <Mark size={36} />
          </Link>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
            <h1 className="t-display-lg" style={{ margin: 0 }}>Check your email.</h1>
            <p className="c-secondary" style={{ margin: 0 }}>
              We sent a link to <b>{sent}</b>. Tap it and you&rsquo;re in. It expires in an hour.
            </p>
            <p className="rl-help">No email? Check spam, or <Link href={signup ? "/signup" : "/login"}>try again</Link>.</p>
          </div>
        </>
      ) : (
        <AuthFormClient mode={mode} action={withPassword} linkAction={sendLink} error={error} next={next} initialRole={initialRole} configured={isConfigured()} />
      )}
    </main>
  );
}
