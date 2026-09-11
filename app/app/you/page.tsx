import { Ink } from "@/components/ui/Ink";

export const metadata = { title: "You" };

export default function You() {
  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <h1 className="t-display-lg" style={{ margin: 0 }}>You</h1>
      <Ink name="route" style={{ width: "min(100%, 300px)", opacity: 0.8, marginTop: "calc(-1 * var(--rl-space-3))" }} />
      <div className="rl-card">
        <span className="t-heading">Strava</span>
        <span className="c-secondary">Connect once and finished runs mark themselves done.</span>
        <button className="rl-btn rl-btn-secondary" disabled>Connect Strava (phase 4)</button>
      </div>
      <div className="rl-card">
        <span className="t-heading">Watch</span>
        <span className="c-secondary">Each run has a .FIT download. Import it into Garmin Connect or the Coros app.</span>
      </div>
    </main>
  );
}
