// Back from Stripe Checkout. Confirms the session with Stripe and creates the rows if the webhook has not yet.
import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import { fulfilCheckoutSession, getSellable } from "@/lib/db/billing";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "You're in" };
export const dynamic = "force-dynamic";

export default async function Joined({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const stripe = getStripe();
  let title = "You're in.";
  let sub = "";
  if (stripe && session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const owner = session.metadata?.follower_id ?? session.client_reference_id;
      if (user && owner === user.id) {
        const { programId } = await fulfilCheckoutSession(session);
        const program = programId ? await getSellable(programId) : null;
        if (program) sub = program.isLetter ? "The Letter arrives every week." : program.title;
      } else {
        title = "Payment received.";
      }
    } catch (e) {
      console.error("joined", e);
      title = "Payment received.";
      sub = "It can take a minute to show up.";
    }
  }
  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)", alignItems: "flex-start" }}>
      <div className="rl-stack" style={{ gap: 4 }}>
        <span className="t-label c-muted">Done</span>
        <h1 className="t-display-lg" style={{ margin: 0 }}>{title}</h1>
        {sub && <span className="c-secondary">{sub}</span>}
      </div>
      <Link href="/app" className="rl-btn rl-btn-primary rl-btn-lg">Today</Link>
    </main>
  );
}
