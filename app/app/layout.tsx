import Link from "next/link";
import { Mark } from "@/components/ui/Logo";
import { TabBar } from "./TabBar";
import { SignedInAnalytics } from "@/components/analytics/SignedInAnalytics";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/db/programs";
import { isConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Home" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Runner accounts only. A creator account lives in the studio.
  const me = isConfigured() ? await getMyProfile() : null;
  if (me?.isCreator) redirect("/studio?kind=creator");
  return (
    <div className="rl-app-shell rl-theme-paper"><div className="rl-app">
      <SignedInAnalytics role="runner" />
      <header className="rl-app-head">
        <Link href="/app" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter">
          <Mark size={28} />
        </Link>
        <TabBar variant="top" />
        <form action="/auth/signout" method="post">
          <button className="rl-btn rl-btn-ghost rl-btn-sm" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <div style={{ flex: 1 }}>{children}</div>
      <TabBar />
    </div></div>
  );
}
