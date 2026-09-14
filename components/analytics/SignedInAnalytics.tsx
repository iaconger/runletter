// Server half: reads the user and hands the id to the client boot. Used in the /app and /studio layouts.
import { Analytics } from "@/components/analytics/Analytics";
import { getUser, isConfigured } from "@/lib/supabase/server";

export async function SignedInAnalytics({ role }: { role: "runner" | "creator" }) {
  const user = isConfigured() ? await getUser() : null;
  return <Analytics userId={user?.id ?? null} role={role} />;
}
