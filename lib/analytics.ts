// Product analytics: one helper for both sides. In the browser it is posthog-js; on the server it is
// posthog-node (loaded lazily so it never lands in the client bundle). No key set = every call is a no-op.
// Event names live here so the two sides cannot drift.

export const EVENTS = {
  signup_completed: "signup_completed",
  onboarding_completed: "onboarding_completed",
  connect_strava_started: "connect_strava_started",
  connect_strava_completed: "connect_strava_completed",
  program_published: "program_published",
  letter_week_sent: "letter_week_sent",
  run_sent_to_watch: "run_sent_to_watch",
  run_marked_done: "run_marked_done",
  checkout_started: "checkout_started",
  checkout_completed: "checkout_completed",
  subscription_cancelled: "subscription_cancelled",
  extra_run_synced: "extra_run_synced",
  run_scheduled: "run_scheduled",
} as const;
export type AnalyticsEvent = keyof typeof EVENTS;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export function analyticsEnabled(): boolean {
  return Boolean(KEY);
}

const isBrowser = typeof window !== "undefined";

// ---------- browser ----------

type BrowserPosthog = typeof import("posthog-js").default;
let browser: BrowserPosthog | null | undefined;

async function browserClient(): Promise<BrowserPosthog | null> {
  if (!isBrowser || !KEY) return null;
  if (browser !== undefined) return browser;
  const mod = await import("posthog-js");
  const ph = mod.default;
  ph.init(KEY, { api_host: HOST, capture_pageview: true, capture_pageleave: true, persistence: "localStorage+cookie", autocapture: false });
  browser = ph;
  return browser;
}

/** Call once on the client when the app mounts (see components/analytics/Analytics.tsx). */
export async function initAnalytics(): Promise<void> {
  await browserClient();
}

// ---------- server ----------

type ServerPosthog = InstanceType<typeof import("posthog-node").PostHog>;
let server: ServerPosthog | null | undefined;

async function serverClient(): Promise<ServerPosthog | null> {
  if (isBrowser || !KEY) return null;
  if (server !== undefined) return server;
  // Resolved at runtime on the server only; keeps posthog-node out of the browser bundle.
  const name = "posthog-node";
  const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ name)) as typeof import("posthog-node");
  server = new mod.PostHog(KEY, { host: HOST, flushAt: 1, flushInterval: 0 });
  return server;
}

// ---------- the API both sides use ----------

/**
 * Record an event. In the browser the person is whoever was identified (or the anonymous id).
 * On the server pass the Supabase user id as distinctId; without one the event is dropped.
 */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>, distinctId?: string): void {
  if (!KEY) return;
  if (isBrowser) {
    void browserClient().then((ph) => ph?.capture(event, props));
    return;
  }
  if (!distinctId) return;
  void serverClient()
    .then((ph) => ph?.capture({ distinctId, event, properties: props }))
    .catch((e) => console.error("analytics", e));
}

/** Tie the anonymous browser id to the signed-in user. Server side: set person properties. */
export function identify(distinctId: string, props?: Record<string, unknown>): void {
  if (!KEY) return;
  if (isBrowser) {
    void browserClient().then((ph) => ph?.identify(distinctId, props));
    return;
  }
  void serverClient()
    .then((ph) => ph?.identify({ distinctId, properties: props }))
    .catch((e) => console.error("analytics", e));
}

export function resetAnalytics(): void {
  if (!KEY || !isBrowser) return;
  void browserClient().then((ph) => ph?.reset());
}
