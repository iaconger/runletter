"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/studio/overview", label: "Overview" },
  { href: "/studio/week", label: "Your week" },
  { href: "/studio/plans", label: "Plans" },
  { href: "/studio/subscribers", label: "Runners" },
  { href: "/studio/page", label: "Your page" },
];

export function StudioNav() {
  const path = usePathname();
  return (
    <nav>
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} aria-current={path === i.href || (i.href !== "/studio" && path.startsWith(i.href)) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
