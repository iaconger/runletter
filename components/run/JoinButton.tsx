// Subscribe (Letter, monthly) or Buy (plan, once). Server component: decides free / paid / coming soon and
// renders one button. Free stays free: no Stripe account on the creator, or a price of 0, joins at once.
import Link from "next/link";
import { joinAction } from "@/app/app/actions";
import { fmtPrice, type Profile, type Program } from "@/lib/types";
import { stripeEnabled } from "@/lib/stripe";
import type { MyAccess } from "@/lib/db/programs";

type Props = {
  program: Pick<Program, "id" | "creatorId" | "isLetter" | "priceCents" | "access">;
  creator: Pick<Profile, "displayName" | "handle" | "stripeChargesEnabled">;
  access: MyAccess;
  back: string;
  className?: string;
  example?: boolean;
};

export function priceLabel(program: Props["program"], creator: Props["creator"]): string {
  const paid = (program.priceCents ?? 0) > 0 && creator.stripeChargesEnabled;
  if (!paid) return "Free";
  return program.isLetter ? fmtPrice(program.priceCents, "mo") : fmtPrice(program.priceCents);
}

export function JoinButton({ program, creator, access, back, className = "rl-btn rl-btn-primary rl-btn-lg", example }: Props) {
  const verb = program.isLetter ? "Subscribe" : program.access === "creator_sub" ? "Subscribe" : "Buy";
  const paid = (program.priceCents ?? 0) > 0 && creator.stripeChargesEnabled;
  const label = paid ? `${verb} · ${priceLabel(program, creator)}` : `${verb} · free`;
  if (example) return <Link href="/signup" className={className}>{label}</Link>;
  if (access.own) return <Link href="/studio" className={className}>Open in the studio →</Link>;
  if (!access.signedIn) return <Link href={`/signup?next=${encodeURIComponent(back)}`} className={className}>{label}</Link>;
  if ((program.isLetter && access.subscribed) || (!program.isLetter && (access.purchased || (program.access === "creator_sub" && access.subscribed)))) {
    return <Link href="/app" className={className}>Open in the app →</Link>;
  }
  if (paid && !stripeEnabled()) {
    return <button type="button" className={className} disabled title="Payments coming soon">{priceLabel(program, creator)} · Payments coming soon</button>;
  }
  return (
    <form action={joinAction} style={{ display: "contents" }}>
      <input type="hidden" name="programId" value={program.id} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" className={className}>{label}</button>
    </form>
  );
}
