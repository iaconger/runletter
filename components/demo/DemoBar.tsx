"use client";
// The strip that follows you around the walkthrough. It says plainly that none of these people are real,
// and it is the way out into signing up.
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/demo", label: "Start" },
  { href: "/demo/studio", label: "Creator studio" },
  { href: "/demo/studio/runners", label: "Runners" },
  { href: "/demo/runner", label: "Runner's home" },
  { href: "/c/sarah", label: "A public page" },
];

export function DemoBar() {
  const here = usePathname();
  return (
    <div className="rl-demobar">
      <span className="tag">Demo</span>
      <span className="say">Invented people, invented weeks. Nothing here is real.</span>
      <nav aria-label="Walkthrough">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.href === here ? "page" : undefined}>{l.label}</Link>
        ))}
      </nav>
      <Link href="/signup?as=creator" className="rl-btn rl-btn-primary rl-btn-sm cta">Open a studio</Link>
    </div>
  );
}
