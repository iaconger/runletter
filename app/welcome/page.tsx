// Onboarding after the first magic link.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mark } from "@/components/ui/Logo";
import { getMyProfile } from "@/lib/db/programs";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

export default async function Welcome({ searchParams }: { searchParams: Promise<{ next?: string; role?: string; step?: string; connected?: string }> }) {
  const { next, role, step, connected } = await searchParams;
  if (!isConfigured()) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signup");
  const profile = await getMyProfile();
  if (!profile) redirect("/signup");
  const metaRole = (user.user_metadata?.role as string | undefined) === "creator" ? "creator" : "runner";
  const r = role === "creator" || role === "runner" ? role : metaRole;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  const { data: conns } = await supabase.from("connections").select("provider").eq("user_id", user.id);
  const stravaConnected = connected === "strava" || !!conns?.some((c) => c.provider === "strava");
  const startStep = step === "3" ? 3 : 0;

  return (
    <main className="rl-page rl-stack" style={{ maxWidth: 560, minHeight: "100vh", justifyContent: "center", gap: "var(--rl-space-6)" }}>
      <Link href="/" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter home"><Mark size={36} /></Link>
      <Onboarding profile={profile} userId={user.id} next={safeNext} role={r} startStep={startStep} stravaConnected={stravaConnected} />
    </main>
  );
}
