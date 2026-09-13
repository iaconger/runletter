export const metadata = { title: "Payouts" };
export default function Payouts() {
  return (
    <main className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <h1 className="t-display-lg" style={{ margin: 0 }}>Payouts</h1>
      <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-2)", alignItems: "flex-start" }}>
        <span className="t-heading">Stripe Connect lands in build week 4</span>
        <span className="c-secondary" style={{ maxWidth: "52ch" }}>You&rsquo;ll connect a Stripe Express account here. Followers pay you directly; RunLetter takes 20 percent after fees, nothing for your first 90 days.</span>
      </div>
    </main>
  );
}
