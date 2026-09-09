/**
 * Shared by the running app and by the build-time prerender script, so it must
 * stay free of `import.meta.env` (Vite-only) and `process.env` (Node-only).
 * Each side reads its own environment and passes the value in.
 */

export const DEFAULT_SITE_URL = "https://docs.beyouweb.com";

/** Where the prerender script reads content from when no override is given. */
export const DEFAULT_API_BASE_URL = "https://api.beyouweb.com/api/v1";

export const SITE_NAME = "Beyou Docs";

export const ORGANIZATION_NAME = "Beyou";

/** The app this site documents — used by the Organization/SoftwareApplication JSON-LD. */
export const APP_URL = "https://app.beyouweb.com";
/** The Android app on Google Play. */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.beyou.mobile";

export const OG_IMAGE_PATH = "/og-cover.png";

export const OG_IMAGE_WIDTH = 1200;

export const OG_IMAGE_HEIGHT = 630;

/** Trailing slashes are stripped so callers can always concatenate a leading-slash path. */
export function resolveSiteUrl(explicit?: string | null): string {
  const value = explicit?.trim();
  const base = value && value.length > 0 ? value : DEFAULT_SITE_URL;

  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function resolveApiBaseUrl(explicit?: string | null): string {
  const value = explicit?.trim();
  const base = value && value.length > 0 ? value : DEFAULT_API_BASE_URL;

  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function absoluteUrl(siteUrl: string, path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
