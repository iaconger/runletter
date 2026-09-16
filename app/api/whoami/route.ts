// GET /api/whoami -> what the server thinks about the browser that asked. Diagnostic only: ids and
// booleans, never tokens. Open it in the same tab where a page claims you are signed out.
import { NextResponse } from "next/server";
import { createClient, currentUser, isConfigured } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const names = jar.getAll().map((c) => c.name);
  if (!isConfigured()) return NextResponse.json({ configured: false, cookies: names });
  const user = await currentUser();
  if (!user) return NextResponse.json({ configured: true, signedIn: false, cookies: names });
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, handle, is_creator").eq("id", user.id).maybeSingle();
  return NextResponse.json({
    configured: true,
    signedIn: true,
    userId: user.id,
    email: user.email,
    profile: data ?? null,
    profileError: error ? { code: error.code, message: error.message } : null,
    cookies: names,
  });
}
