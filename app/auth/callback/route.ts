// Magic-link landing. Exchanges the code for a session, then sends the user on.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/origin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A profile still on its generated handle hasn't been through onboarding yet.
      const { data: profile } = await supabase.from("profiles").select("handle").eq("id", data.user.id).maybeSingle();
      if (profile && profile.handle.startsWith("u_")) {
        const role = (data.user.user_metadata?.role as string | undefined) === "creator" ? "creator" : "runner";
        return NextResponse.redirect(`${origin}/welcome?next=${encodeURIComponent(safeNext)}&role=${role}`);
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is invalid or expired. Try again.")}`);
}
