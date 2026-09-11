import Link from "next/link";
import { redirect } from "next/navigation";
import { Mark } from "@/components/ui/Logo";
import { createClient, isConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

async function sendLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "/app");
  if (!email) redirect("/login?error=Enter+your+email");
  if (!isConfigured()) redirect("/login?error=Supabase+is+not+configured+yet");

  const supabase = await createClient();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sent, error, next } = await searchParams;
  return (
    <main className="rl-page rl-stack" style={{ maxWidth: 420, minHeight: "100vh", justifyContent: "center", gap: "var(--rl-space-6)" }}>
      <Link href="/" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter home">
        <Mark size={36} />
      </Link>
      {sent ? (
        <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
          <h1 className="t-display-lg" style={{ margin: 0 }}>
            Check your email.
          </h1>
          <p className="c-secondary" style={{ margin: 0 }}>
            We sent a sign-in link to <b>{sent}</b>. It expires in an hour.
          </p>
        </div>
      ) : (
        <form action={sendLink} className="rl-stack" style={{ gap: "var(--rl-space-5)" }}>
          <div className="rl-stack" style={{ gap: "var(--rl-space-2)" }}>
            <h1 className="t-display-lg" style={{ margin: 0 }}>
              Sign in
            </h1>
            <p className="c-secondary" style={{ margin: 0 }}>
              No password. We email you a link.
            </p>
          </div>
          <input type="hidden" name="next" value={next ?? "/app"} />
          <div className="rl-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="rl-input" placeholder="you@example.com" autoComplete="email" required />
            {error && (
              <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>
                {error}
              </span>
            )}
          </div>
          <button type="submit" className="rl-btn rl-btn-primary rl-btn-lg">
            Email me a link
          </button>
          {!isConfigured() && <span className="rl-help">Supabase env vars are not set, so this form will not send yet. See the README.</span>}
        </form>
      )}
    </main>
  );
}
