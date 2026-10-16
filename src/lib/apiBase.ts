/**
 * Resolves the docs API root. Was copy-pasted, identically, into all five
 * api modules.
 *
 * The backend runs under a servlet context-path of `/api/v1`, and every caller
 * appends paths like `/docs/blog/topics`. The old default left the prefix out —
 * it produced `https://<host>/docs/blog/topics`, which the backend answers with
 * a 404. It went unnoticed because local development sets VITE_BACKEND_URL by
 * hand, and this app had never been deployed.
 *
 * In production Cloudflare serves the site as static files (wrangler.jsonc) and
 * proxies nothing, so the deploy job sets VITE_BACKEND_URL to the public API
 * and the backend's CORS_ALLOWED_PATTERN lists the docs origin. The requests
 * are plain GETs with no custom headers, so they need no preflight.
 *
 * Unset, the base comes from the current origin. That is the nginx image's
 * case: its nginx proxies `/api/v1/` to the backend, which keeps requests
 * same-origin and leaves the image unpinned to any one hostname.
 */

const API_CONTEXT_PATH = "/api/v1";

const DEV_API_ORIGIN = "http://localhost:8099";

export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();

  if (configured) {
    return stripTrailingSlash(configured);
  }

  const origin =
    import.meta.env.DEV || typeof window === "undefined"
      ? DEV_API_ORIGIN
      : window.location.origin;

  return `${stripTrailingSlash(origin)}${API_CONTEXT_PATH}`;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
