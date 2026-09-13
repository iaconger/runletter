// The public origin of this request. Behind Render (and any proxy) request.url is the internal address,
// so anything that sends the browser somewhere must use the forwarded host instead.
import type { NextRequest } from "next/server";

export function publicOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
