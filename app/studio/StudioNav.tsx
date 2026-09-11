"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/studio", label: "Programs" },
  { href: "/studio/subscribers", label: "Subscribers" },
  { href: "/studio/page", label: "Your page" },
  { href: "/studio/payouts", label: "Payouts" },
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
