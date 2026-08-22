import posthog from "posthog-js";

/**
 * Product analytics for the docs site (PostHog Cloud) — the docs sibling of
 * the app's `apps/web/src/lib/analytics.ts`, sharing the one Beyou project;
 * docs traffic is separated in insights by `$host` (docs.beyouweb.com).
 *
 * Same dormant-by-default posture as everywhere else in this stack: no
 * VITE_POSTHOG_KEY, no `posthog.init()`, nothing captured on a dev machine or
 * CI runner.
 *
 * Two deliberate differences from the app's config:
 * - No masking. Every page here is public documentation the site itself
 *   publishes — element text is exactly what makes "which link do readers
 *   click" answerable, and there is no user-written content to leak.
 * - No identify. Docs readers have no account; everyone stays anonymous
 *   (`person_profiles: "identified_only"` keeps those visits from minting
 *   billed person profiles).
 */

/** Set once `initAnalytics()` has actually called `posthog.init()`. */
let initialised = false;

/** Test seam. */
export function isAnalyticsInitialised(): boolean {
  return initialised;
}

export function initAnalytics(): boolean {
  if (initialised) return true;

  // The build prerenders routes in Node (scripts/prerender.mts), where there
  // is no window and nothing to capture — and posthog-js expects a browser.
  if (typeof window === "undefined") return false;

  const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
  if (!key) return false;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",

    // Dated defaults bundle — captures SPA pageviews on history changes,
    // which this react-router site needs beyond the prerendered first load.
    defaults: "2025-05-24",

    autocapture: true,
    person_profiles: "identified_only",
    disable_session_recording: true,
  });

  initialised = true;
  return true;
}
