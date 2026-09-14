"use client";
// One photo: preview, choose or replace, remove. Crops and resizes in the browser (lib/image.ts), uploads to a
// public bucket under the user's folder, then hands the URL (or null) to the caller to save.
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage, type ImageSpec } from "@/lib/image";

type Props = {
  userId: string;
  bucket: "avatars" | "covers";
  /** File name prefix inside the user's folder, e.g. "avatar" or the program id. */
  name: string;
  spec: ImageSpec;
  url: string | null;
  onChange: (url: string | null) => Promise<void> | void;
  shape?: "circle" | "wide" | "card";
  label?: string;
  size?: number;
};

export function PhotoField({ userId, bucket, name, spec, url, onChange, shape = "card", label, size = 88 }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    setBusy(true);
    setError(null);
    try {
      const { blob, ext, type } = await prepareImage(file, spec);
      const supabase = createClient();
      const path = `${userId}/${name}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      await onChange(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const frame: React.CSSProperties =
    shape === "circle"
      ? { width: size, height: size, borderRadius: "50%", flex: "none" }
      : { aspectRatio: shape === "wide" ? "21 / 9" : "4 / 3", borderRadius: "var(--rl-radius-md)", width: "100%" };

  return (
    <div className={shape === "circle" ? "rl-row" : "rl-stack"} style={{ gap: shape === "circle" ? "var(--rl-space-4)" : 6, alignItems: shape === "circle" ? "center" : undefined }}>
      <span aria-hidden="true" style={{ ...frame, overflow: "hidden", background: "var(--rl-surface-sunken)", border: "var(--rl-border-hairline) solid var(--rl-hairline)", display: "block" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </span>
      <div className="rl-stack" style={{ gap: 6 }}>
        {label && <span className="t-body-medium">{label}</span>}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        <div className="rl-row" style={{ gap: 6 }}>
          <button type="button" className="rl-btn rl-btn-secondary rl-btn-sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Uploading…" : url ? "Replace" : "Choose photo"}</button>
          {url && !busy && <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" onClick={() => onChange(null)}>Remove</button>}
        </div>
        {error && <span className="rl-help" role="alert" style={{ color: "var(--rl-danger, #b3261e)" }}>{error}</span>}
      </div>
    </div>
  );
}
