"use client";
// The Sync button, with the wait made visible: the button says what it is doing and a line under the row
// counts the stages, because a 90-day pull takes a few seconds and a dead button reads as broken.
import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";

const STAGES = ["Asking Strava…", "Reading your activities…", "Saving your runs…", "Almost there…"];

export function SyncButton({ label = "Sync last 90 days" }: { label?: string }) {
  const { pending } = useFormStatus();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!pending) {
      const id = setTimeout(() => setStage(0), 0);
      return () => clearTimeout(id);
    }
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2200);
    return () => clearInterval(t);
  }, [pending]);
  return (
    <span className="rl-stack" style={{ gap: 4, alignItems: "flex-end" }}>
      <button type="submit" className="rl-btn rl-btn-secondary rl-btn-sm" disabled={pending} aria-busy={pending}>
        {pending && <span className="rl-spinner" aria-hidden />}
        {pending ? "Syncing" : label}
      </button>
      <span className="rl-help" aria-live="polite" style={{ minHeight: 16, opacity: pending ? 1 : 0, transition: "opacity 150ms" }}>
        {pending ? STAGES[stage] : ""}
      </span>
    </span>
  );
}
