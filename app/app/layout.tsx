import Link from "next/link";
import { Mark } from "@/components/ui/Logo";
import { TabBar } from "./TabBar";

export const metadata = { title: "Today" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" }}>
      <header className="rl-between" style={{ alignItems: "center", padding: "var(--rl-space-4) var(--rl-space-4) 0" }}>
        <Link href="/app" className="rl-logo" style={{ color: "var(--rl-text)" }} aria-label="RunLetter">
          <Mark size={28} />
        </Link>
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
