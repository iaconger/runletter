// The connections card. Same for runners and creators: connect Strava for completion, Garmin for push
// (when enabled), COROS by file for now. Server component: reads the user's own rows through RLS.
import { createClient } from "@/lib/supabase/server";
import { garminEnabled } from "@/lib/integrations/garmin";
import { stravaEnabled } from "@/lib/integrations/strava";

type Provider = "strava" | "garmin" | "coros";

export async function Connections({ back, notice }: { back: string; notice?: { connected?: string; error?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: rows } = user ? await supabase.from("connections").select("provider, external_id, created_at").eq("user_id", user.id) : { data: [] };
  const has = (p: Provider) => rows?.find((r) => r.provider === p);
  const { data: pushes } = user ? await supabase.from("workout_pushes").select("status").eq("user_id", user.id) : { data: [] };
  const queued = pushes?.filter((p) => p.status === "queued").length ?? 0;
  const sent = pushes?.filter((p) => p.status === "sent").length ?? 0;

  return (
    <section className="rl-card" aria-label="Connections" style={{ gap: "var(--rl-space-4)" }}>
      <div className="rl-stack" style={{ gap: 2 }}>
        <span className="t-label c-muted">Connections</span>
        <span className="t-heading">Watch and Strava</span>
      </div>
      {notice?.connected && <span className="rl-chip rl-chip-success">{notice.connected[0]!.toUpperCase() + notice.connected.slice(1)} connected</span>}
      {notice?.error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{notice.error}</span>}

      <Row
        name="Strava"
        role=""
        detail={has("strava") ? "Finished runs mark the day done." : "Marks finished runs done."}
        connected={!!has("strava")}
        action={stravaEnabled() ? { href: `/api/connect/strava?back=${encodeURIComponent(back)}`, label: "Connect Strava" } : { disabled: "Needs Strava API keys on the server" }}
        back={back}
        provider="strava"
      />
      <Row
        name="Garmin"
        role=""
        detail={
          has("garmin")
            ? `${sent} on your calendar${queued ? `, ${queued} waiting` : ""}.`
            : garminEnabled()
              ? "Workouts land on your watch."
              : "Coming. Import the .FIT for now."
        }
        connected={!!has("garmin")}
        action={garminEnabled() ? { href: `/api/connect/garmin?back=${encodeURIComponent(back)}`, label: "Connect Garmin" } : { disabled: "Coming" }}
        back={back}
        provider="garmin"
      />
      <Row
        name="COROS"
        role=""
        detail="Import the .FIT in the COROS app."
        connected={false}
        action={{ disabled: "File import" }}
        back={back}
        provider="coros"
      />
    </section>
  );
}

function Row({ name, role, detail, connected, action, back, provider }: { name: string; role: string; detail: string; connected: boolean; action: { href: string; label: string } | { disabled: string }; back: string; provider: Provider }) {
  return (
    <div className="rl-between" style={{ gap: "var(--rl-space-4)", alignItems: "flex-start", borderTop: "var(--rl-border-hairline) solid var(--rl-hairline)", paddingTop: "var(--rl-space-3)" }}>
      <div className="rl-stack" style={{ gap: 2, minWidth: 0 }}>
        <span className="rl-row" style={{ gap: 8, alignItems: "baseline" }}>
          <span className="t-body-medium">{name}</span>
          {role && <span className="t-label c-muted">{role}</span>}
          {connected && <span className="rl-chip rl-chip-success" style={{ fontSize: 11 }}>Connected</span>}
        </span>
        <span className="rl-help">{detail}</span>
      </div>
      {connected ? (
        <form action="/api/connect/disconnect" method="post">
          <input type="hidden" name="provider" value={provider} />
          <input type="hidden" name="back" value={back} />
          <button type="submit" className="rl-btn rl-btn-ghost rl-btn-sm">Disconnect</button>
        </form>
      ) : "href" in action ? (
        <a href={action.href} className="rl-btn rl-btn-secondary rl-btn-sm" style={{ whiteSpace: "nowrap" }}>{action.label}</a>
      ) : (
        <span className="rl-chip" style={{ whiteSpace: "nowrap" }}>{action.disabled}</span>
      )}
    </div>
  );
}
