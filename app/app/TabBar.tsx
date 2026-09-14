"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Today" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/explore", label: "Explore" },
  { href: "/app/you", label: "You" },
];

/** Bottom tabs on phones, a row of links in the header on wider screens. One component, CSS decides. */
export function TabBar({ variant = "bottom" }: { variant?: "bottom" | "top" }) {
  const path = usePathname();
  return (
    <nav className={variant === "top" ? "rl-topnav" : "rl-tabbar"} aria-label="Primary">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
