// Server-side Supabase client for Server Components, Route Handlers and Server Actions.
// Reads/writes the auth cookies through next/headers. Anon key + RLS; never the service role key here.

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are read-only there.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * The signed-in user, once per request. Every auth.getUser() is a round trip to Supabase, and a page that
 * asked four times could have one of them fail and render as if nobody was signed in. React's cache() makes
 * it one call, and a failure is logged rather than quietly becoming "please sign in".
 */
export const currentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") console.error("auth.getUser", error.name, error.message);
  return data.user ?? null;
});

/** Current user or null. */
export async function getUser() {
  return currentUser();
}

/** True when Supabase env vars are present. Lets the static screens run before accounts exist. */
export function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
