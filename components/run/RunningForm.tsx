"use client";
// The runner questionnaire: goal, race date, days a week, 5K time. One screen. Used in onboarding and on You.
import { useState, useTransition } from "react";
import { GOAL_LABEL, type Profile } from "@/lib/types";
import { fmtTime } from "@/lib/paces";
import { saveRunningAction } from "@/app/welcome/actions";

const GOALS = ["other", "5k", "10k", "half", "marathon", "base"] as const;

export function RunningForm({ profile, onDone, onSkip, submitLabel = "Continue" }: { profile: Pick<Profile, "goal" | "raceDate" | "daysPerWeek" | "pace5kS">; onDone?: () => void; onSkip?: () => void; submitLabel?: string }) {
  const [goal, setGoal] = useState<string>(profile.goal ?? "other");
  const [raceDate, setRaceDate] = useState(profile.raceDate ?? "");
  const [days, setDays] = useState<number | null>(profile.daysPerWeek);
  const [time5k, setTime5k] = useState(profile.pace5kS ? fmtTime(profile.pace5kS) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const race = goal !== "other" && goal !== "base";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await saveRunningAction({ goal, raceDate: race ? raceDate : "", daysPerWeek: days, time5k });
      if (!r.ok) return setError(r.error ?? "Could not save");
      setSaved(true);
      onDone?.();
    });
  }

  return (
    <form className="rl-stack" style={{ gap: "var(--rl-space-5)" }} onSubmit={submit}>
      <div className="rl-field">
        <label>Running for</label>
        <div className="rl-row" style={{ gap: 6 }} role="radiogroup" aria-label="Goal">
          {GOALS.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={goal === g} className={`rl-chip${goal === g ? " rl-chip-on" : ""}`} onClick={() => setGoal(g)} style={{ cursor: "pointer" }}>{GOAL_LABEL[g]}</button>
          ))}
        </div>
      </div>
      {race && (
        <div className="rl-field">
          <label htmlFor="raceDate">Race date</label>
          <input id="raceDate" type="date" className="rl-input" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} style={{ maxWidth: 200 }} />
        </div>
      )}
      <div className="rl-field">
        <label>Days a week</label>
        <div className="rl-row" style={{ gap: 6 }} role="radiogroup" aria-label="Days a week">
          {[2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={days === n} className={`rl-chip${days === n ? " rl-chip-on" : ""}`} onClick={() => setDays(days === n ? null : n)} style={{ cursor: "pointer", minWidth: 40, justifyContent: "center" }}>{n}</button>
          ))}
        </div>
      </div>
      <div className="rl-field">
        <label htmlFor="time5k">5K time</label>
        <input id="time5k" className="rl-input" value={time5k} onChange={(e) => setTime5k(e.target.value)} placeholder="24:30" inputMode="numeric" style={{ maxWidth: 140 }} />
      </div>
      {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
      {saved && !onDone && <span className="rl-help" role="status" style={{ color: "var(--rl-success)" }}>Saved.</span>}
      <div className="rl-row">
        <button type="submit" className={`rl-btn rl-btn-primary ${onSkip ? "rl-btn-lg" : "rl-btn-sm"}`} disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
        {onSkip && <button type="button" className="rl-btn rl-btn-ghost rl-btn-lg" onClick={onSkip}>Skip</button>}
      </div>
    </form>
  );
}
