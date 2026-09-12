// POST /api/connect/disconnect (form: provider, back) -> remove the user's connection. RLS allows deleting your own.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const provider = String(form.get("provider"));
  const back = String(form.get("back") ?? "/app/you");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (provider === "strava" || provider === "garmin" || provider === "coros") {
    await supabase.from("connections").delete().eq("user_id", user.id).eq("provider", provider);
  }
  return NextResponse.redirect(new URL(back, request.url), 303);
}
