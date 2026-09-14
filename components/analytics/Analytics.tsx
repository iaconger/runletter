"use client";
// Boots posthog-js and ties the browser to the signed-in user. Renders nothing. No key = does nothing.
import { useEffect } from "react";
import { identify, initAnalytics } from "@/lib/analytics";

export function Analytics({ userId, role }: { userId?: string | null; role?: "runner" | "creator" | null }) {
  useEffect(() => {
    void initAnalytics();
    if (userId) identify(userId, role ? { role } : undefined);
  }, [userId, role]);
  return null;
}
