import Link from "next/link";
import { Mark } from "@/components/ui/Logo";
import { TabBar } from "./TabBar";
import { SignedInAnalytics } from "@/components/analytics/SignedInAnalytics";

export const metadata = { title: "Today" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rl-app">
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
    </div>
  );
}
