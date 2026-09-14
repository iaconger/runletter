// Client-side image prep before upload: centre-crop to a ratio, cap the size, encode as WebP.
// Used by onboarding, the studio Your page and the plan editor so every photo gets the same treatment.

export type ImageSpec = { width: number; height: number };
export const IMAGE_SPEC = {
  avatar: { width: 512, height: 512 },
  cover: { width: 1600, height: 686 }, // 21:9 creator page hero
  planCover: { width: 1200, height: 900 }, // 4:3 plan cards
} as const satisfies Record<string, ImageSpec>;

export async function prepareImage(file: File, spec: ImageSpec, quality = 0.86): Promise<{ blob: Blob; ext: string; type: string }> {
  if (typeof window === "undefined" || typeof document === "undefined") return { blob: file, ext: extOf(file.type), type: file.type };
  const bitmap = await loadBitmap(file);
  const scale = Math.max(spec.width / bitmap.width, spec.height / bitmap.height);
  // Never upscale small images beyond their size: crop to the ratio at native resolution instead.
  const s = Math.min(scale, 1);
  const w = Math.round(spec.width * (s / scale));
  const h = Math.round(spec.height * (s / scale));
  const sw = Math.round(w / s);
  const sh = Math.round(h / s);
  const sx = Math.round((bitmap.width - sw) / 2);
  const sy = Math.round((bitmap.height - sh) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, ext: extOf(file.type), type: file.type };
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  if ("close" in bitmap) bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
  if (!blob) return { blob: file, ext: extOf(file.type), type: file.type };
  return { blob, ext: "webp", type: "image/webp" };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extOf(type: string): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}
