import { Ink } from "@/components/ui/Ink";
export const metadata = { title: "Subscribers" };
export default function Subscribers() {
  return (
    <main className="rl-page rl-wide rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <h1 className="t-display-lg" style={{ margin: 0 }}>Subscribers</h1>
      <div className="rl-card rl-sunken" style={{ gap: "var(--rl-space-3)", alignItems: "flex-start" }}>
        <Ink name="sequence" style={{ width: "min(100%, 360px)", opacity: 0.8 }} />
        <span className="t-heading">Nobody yet, and that&rsquo;s expected</span>
        <span className="c-secondary" style={{ maxWidth: "52ch" }}>Subscriptions turn on when Stripe is connected (build week 4). Then this is the list you can&rsquo;t get from a PDF: who&rsquo;s on which week, when they last ran, and who&rsquo;s gone quiet.</span>
      </div>
    </main>
  );
}
