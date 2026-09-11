"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Today" },
  { href: "/app/week", label: "Week" },
  { href: "/app/creators", label: "Creators" },
  { href: "/app/you", label: "You" },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="rl-tabbar" aria-label="Primary">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
