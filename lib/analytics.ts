// Product analytics. Filled in with PostHog in a later step; until then every call is a no-op.
export type AnalyticsEvent = string;
export function track(_event: AnalyticsEvent, _props?: Record<string, unknown>, _distinctId?: string): void {}
