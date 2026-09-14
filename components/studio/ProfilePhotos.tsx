"use client";
// Profile photo and creator cover on the studio Your page. Saves on each change.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoField } from "@/components/ui/PhotoField";
import { IMAGE_SPEC } from "@/lib/image";
import { saveImagesAction } from "@/app/welcome/actions";

export function ProfilePhotos({ userId, avatarUrl, coverUrl }: { userId: string; avatarUrl: string | null; coverUrl: string | null }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(avatarUrl);
  const [cover, setCover] = useState(coverUrl);
  async function save(kind: "avatar" | "cover", url: string | null) {
    const r = await saveImagesAction(kind === "avatar" ? { avatarUrl: url } : { coverUrl: url });
    if (!r.ok) throw new Error(r.error);
    if (kind === "avatar") setAvatar(url);
    else setCover(url);
    router.refresh();
  }
  return (
    <section className="rl-card" aria-label="Photos" style={{ gap: "var(--rl-space-4)" }}>
      <span className="t-label c-muted">Photos</span>
      <PhotoField userId={userId} bucket="avatars" name="avatar" spec={IMAGE_SPEC.avatar} url={avatar} onChange={(u) => save("avatar", u)} shape="circle" label="Profile photo" />
      <PhotoField userId={userId} bucket="avatars" name="cover" spec={IMAGE_SPEC.cover} url={cover} onChange={(u) => save("cover", u)} shape="wide" label="Cover" />
    </section>
  );
}
