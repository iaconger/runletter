// The studio, minus the account. Same chrome a creator sees after signing in, with the nav pointing at
// the walkthrough instead of at real screens.
import Link from "next/link";
import { Lockup } from "@/components/ui/Logo";

const ITEMS = [
  { href: "/demo/studio", label: "Your week" },
  { href: "/demo/studio/runners", label: "Runners" },
  { href: "/c/sarah", label: "Your page" },
];

export function DemoStudioShell({ here, children }: { here: string; children: React.ReactNode }) {
  return (
    <div className="rl-studio rl-theme-night">
      <aside className="rl-sidebar">
        <span className="rl-studio-brand">
          <Lockup height={18} />
          <span>for creators</span>
        </span>
        <nav>
          {ITEMS.map((i) => (
            <Link key={i.href} href={i.href} aria-current={i.href === here ? "page" : undefined}>{i.label}</Link>
          ))}
        </nav>
        <Link href="/signup?as=creator" className="rl-btn rl-btn-secondary rl-btn-sm" style={{ marginTop: "auto" }}>Open a studio</Link>
      </aside>
      <div>{children}</div>
    </div>
  );
}
