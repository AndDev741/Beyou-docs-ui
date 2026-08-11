import { Navigate, useLocation } from "react-router-dom";

import { detectPreferredLocale, localizedPath } from "@/lib/i18nRouting";

/**
 * Query params that used to select a detail view, and the path segment that
 * replaced them.
 *
 * Detail pages were addressed as `/blog?post=key`. A query string makes a poor
 * canonical — search engines treat the parameter as a variant of the listing
 * page rather than as a page of its own, so no individual post could rank. They
 * are now path segments; this table keeps links shared before the change alive.
 */
const LEGACY_DETAIL_PARAMS: Record<string, string> = {
  "/blog": "post",
  "/architecture": "topic",
  "/apis": "controller",
};

/**
 * Catches every URL without a locale prefix and sends it to one, preserving the
 * rest of the path so a deep link survives.
 *
 * Replace, not push: the un-prefixed URL should not sit in history where Back
 * would bounce the user straight through it again.
 */
export function LocaleRedirect() {
  const location = useLocation();
  const locale = detectPreferredLocale();

  const search = new URLSearchParams(location.search);
  const legacyParam = LEGACY_DETAIL_PARAMS[location.pathname];
  const legacyKey = legacyParam ? search.get(legacyParam) : null;

  let path = location.pathname;

  if (legacyParam && legacyKey) {
    search.delete(legacyParam);
    path = `${location.pathname}/${encodeURIComponent(legacyKey)}`;
  }

  const remainingSearch = search.toString();
  const target =
    localizedPath(locale, path) +
    (remainingSearch ? `?${remainingSearch}` : "") +
    location.hash;

  return <Navigate to={target} replace />;
}
