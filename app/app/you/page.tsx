import { Ink } from "@/components/ui/Ink";
import { Connections } from "@/components/connections/Connections";

export const metadata = { title: "You" };
export const dynamic = "force-dynamic";

export default async function You({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const notice = await searchParams;
  return (
    <main className="rl-page rl-stack" style={{ gap: "var(--rl-space-6)" }}>
      <h1 className="t-display-lg" style={{ margin: 0 }}>You</h1>
      <Ink name="route" style={{ width: "min(100%, 300px)", opacity: 0.8, marginTop: "calc(-1 * var(--rl-space-3))" }} />
      <Connections back="/app/you" notice={notice} />
    </main>
  );
}
