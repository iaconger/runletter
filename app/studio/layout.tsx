import Link from "next/link";
import { Lockup } from "@/components/ui/Logo";
import { StudioNav } from "./StudioNav";
import { SignedInAnalytics } from "@/components/analytics/SignedInAnalytics";

export const metadata = { title: { default: "Studio", template: "%s · RunLetter Studio" } };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rl-studio">
      <SignedInAnalytics role="creator" />
      <aside className="rl-sidebar">
        <Link href="/studio" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter Studio">
          <Lockup height={24} />
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
