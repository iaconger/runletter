import Link from "next/link";
import { Lockup } from "@/components/ui/Logo";
import { StudioNav } from "./StudioNav";
import { SignedInAnalytics } from "@/components/analytics/SignedInAnalytics";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";

export const metadata = { title: { default: "Studio", template: "%s · RunLetter Studio" } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  // Creator accounts only. A runner account lives in the app.
  const me = isConfigured() ? await getMyProfile() : null;
  if (me && !me.isCreator) redirect("/app?kind=runner");
  return (
    <div className="rl-studio rl-theme-night">
      <SignedInAnalytics role="creator" />
      <aside className="rl-sidebar">
        <Link href="/studio" className="rl-studio-brand" aria-label="RunLetter Studio">
          <Lockup height={18} />
          <span>for creators</span>
        </Link>
        <StudioNav />
        <form action="/auth/signout" method="post" style={{ marginTop: "auto" }}>
          <button className="rl-btn rl-btn-ghost rl-btn-sm" type="submit">Sign out</button>
        </form>
      </aside>
      <div>{children}</div>
    </div>
  );
}
