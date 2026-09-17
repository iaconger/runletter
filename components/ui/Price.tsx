// A price, in the one colour the system uses for money. Free is not money, so it is outlined instead.
import { fmtPrice } from "@/lib/types";

export function Price({ cents, per, size = "md", className = "" }: {
  cents: number | null | undefined;
  /** "mo" for a subscription. Omitted means bought once. */
  per?: "mo";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const n = cents ?? 0;
  const sz = size === "sm" ? " rl-price-sm" : size === "lg" ? " rl-price-lg" : "";
  if (n <= 0) return <span className={`rl-price rl-price-free${sz} ${className}`}>Free</span>;
  return (
    <span className={`rl-price${sz} ${className}`}>
      {fmtPrice(n)}
      {per && <span className="per">/{per}</span>}
    </span>
  );
}
