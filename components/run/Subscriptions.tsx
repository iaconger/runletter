// The runner's subscriptions, with cancel. Server component; reads through RLS.
import Link from "next/link";
import { cancelSubscriptionAction } from "@/app/app/actions";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/db/programs";

export async function Subscriptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: rows } = await supabase.from("subscriptions").select("creator_id, status, stripe_subscription_id, cancel_at_period_end, current_period_end").eq("follower_id", user.id).neq("status", "canceled");
  if (!rows?.length) return null;
  const creators = await Promise.all(rows.map((r) => getProfileById(r.creator_id)));
  return (
    <section className="rl-card" style={{ gap: "var(--rl-space-3)" }}>
      <span className="t-heading">Subscriptions</span>
      {rows.map((r, i) => {
        const c = creators[i];
        if (!c) return null;
        const ends = r.cancel_at_period_end && r.current_period_end ? new Date(r.current_period_end).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
        return (
          <div key={r.creator_id} className="rl-between" style={{ alignItems: "center", borderTop: "var(--rl-border-hairline) solid var(--rl-hairline)", paddingTop: "var(--rl-space-3)" }}>
            <span className="rl-stack" style={{ gap: 0 }}>
              <Link href={`/c/${c.handle}`} className="t-body-medium" style={{ color: "inherit" }}>{c.displayName || `@${c.handle}`}</Link>
              <span className="rl-help">{ends ? `Ends ${ends}` : r.status === "past_due" ? "Payment failed" : r.stripe_subscription_id ? "Monthly" : "Free"}</span>
            </span>
            {!ends && (
              <form action={cancelSubscriptionAction}>
                <input type="hidden" name="creatorId" value={r.creator_id} />
                <button type="submit" className="rl-btn rl-btn-ghost rl-btn-sm">Cancel</button>
              </form>
            )}
          </div>
        );
      })}
    </section>
  );
}
