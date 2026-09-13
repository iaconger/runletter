// A run you can do today, from Explore. Photo of the creator (or their ink portrait), the run type's colour
// as a band, "45 min · Easy", and one action: send to watch. Nothing to start here; the watch runs it.
import Link from "next/link";
import { Portrait } from "@/components/ui/Ink";
import { dayDurationS, RUN_TYPE_LABEL } from "@/lib/types";
import type { ExploreRun } from "@/lib/explore";

export function RunCard({ r, compact = false }: { r: ExploreRun; compact?: boolean }) {
  const mins = Math.round(dayDurationS(r.day) / 60);
  const type = r.day.runType ? RUN_TYPE_LABEL[r.day.runType] : "Run";
  const photo = r.creator.avatarUrl ?? (r.creator.portrait ? `/brand/photo/${r.creator.portrait}.webp` : null);
  const cover = r.cover ?? photo;
  return (
    <article className={`rl-runcard${compact ? " compact" : ""}`} data-run={r.day.runType ?? "easy"}>
      <div className="img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover ? <img src={cover} alt="" /> : r.creator.portrait ? <Portrait name={r.creator.portrait} size={120} photo={false} /> : null}
        <span className="band">{type} · {mins} min</span>
      </div>
      <div className="body">
        <span className="t-heading">{r.title}</span>
        <Link href={`/c/${r.creator.handle}`} className="by">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo && <img src={photo} alt="" width={20} height={20} />}
          {r.creator.name}
        </Link>
        {!compact && r.day.note && <span className="rl-help">{r.day.note}</span>}
        <div className="rl-row" style={{ gap: 6, marginTop: 4 }}>
          <a href={r.fitHref} download className="rl-btn rl-btn-primary rl-btn-sm">Send to watch</a>
          {r.completions ? <span className="rl-chip">{r.completions} ran it</span> : null}
        </div>
      </div>
    </article>
  );
}
