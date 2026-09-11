import Link from "next/link";
import { Ink } from "@/components/ui/Ink";

export default function NotFound() {
  return (
    <main className="rl-page rl-stack" style={{ minHeight: "100vh", justifyContent: "center", alignItems: "flex-start", gap: "var(--rl-space-5)" }}>
      <Ink name="dawn-road" style={{ width: "min(100%, 420px)", opacity: 0.85 }} />
      <h1 className="t-display-lg" style={{ margin: 0 }}>Wrong turn.</h1>
      <p className="c-secondary" style={{ margin: 0 }}>That page isn&rsquo;t here. The road back is short.</p>
      <Link href="/" className="rl-btn rl-btn-primary">Home</Link>
    </main>
  );
}
