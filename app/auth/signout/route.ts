import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/origin";

// Sign out and go home. The redirect uses the public origin: on Render, request.url is the internal
// address (localhost), which the browser cannot reach.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", publicOrigin(request)), { status: 303 });
}
