// A row of example creators. Ink portraits, one line of who they are, the program they'd publish.
import Link from "next/link";
import { EXAMPLE_CREATORS, Portrait } from "@/components/ui/Ink";

export function CreatorRow({ tone = "ink", compact = false }: { tone?: "ink" | "paper"; compact?: boolean }) {
  return (
    <div className="rl-creators" data-tone={tone}>
      {EXAMPLE_CREATORS.map((c) => (
        <Link key={c.name} href={c.name === "sarah" ? "/c/sarah" : "/creators"} className="rl-creator" data-compact={compact ? "true" : undefined}>
          <Portrait name={c.name} size={compact ? 56 : 88} tone={tone} />
          <span className="rl-creator-text">
            <span className="nm">{c.display}</span>
            <span className="fo">{c.focus} · {c.city}</span>
            {!compact && <span className="pg">&ldquo;{c.program}&rdquo;</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}
