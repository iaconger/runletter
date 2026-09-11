// One form, two doors. Magic link either way (no passwords), but sign-up asks for a name and which side you're on,
// and the copy says "create", because "sign in" to an account you don't have is a wall.
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
        <AuthFormClient mode={mode} action={sendLink} error={error} next={next} initialRole={initialRole} configured={isConfigured()} />
      )}
    </main>
  );
}
