/**
 * Locale lives in the URL, not in a detector.
 *
 * Every page exists in English and Portuguese. When both translations answer on
 * the same URL there is nothing for a crawler to index twice — one of the two
 * languages is simply invisible to search. So the locale is a path segment
 * (`/en/blog/x`, `/pt/blog/x`), each version gets its own canonical, and the two
 * point at each other through hreflang.
 *
 * The remembered-language preference still exists, but it only decides where a
 * bare `/` sends you. Once you are on a locale path, that path wins — otherwise
 * a crawler fetching /en/ with a pt-BR Accept-Language header would be served
 * Portuguese under an English canonical.
 */

export const SUPPORTED_LOCALES = ["en", "pt"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

/** Where the remembered choice is stored. Read only to resolve a bare `/`. */
export const LOCALE_STORAGE_KEY = "beyou-docs-locale";

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

/**
 * Maps a BCP-47 tag onto a locale we actually have content for: `pt-BR` -> `pt`.
 * Anything unrecognised becomes the default rather than throwing — this runs on
 * navigator values we do not control.
 */
export function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (!value) return DEFAULT_LOCALE;

  const base = value.trim().toLowerCase().split("-")[0];

  return isSupportedLocale(base) ? base : DEFAULT_LOCALE;
}

/**
 * Only for resolving a bare `/`. Explicit choice beats browser preference.
 */
export function detectPreferredLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // Private mode / blocked storage. Fall through to the browser preference.
  }

  const preferences = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language];

  for (const preference of preferences) {
    const base = preference?.trim().toLowerCase().split("-")[0];
    if (isSupportedLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}

export function rememberLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Not being able to remember the choice is not worth breaking navigation over.
  }
}

/**
 * Builds an absolute in-app path. `path` is always written locale-free at the
 * call site (`/blog/foo`), so links never have to know which locale they are in.
 */
export function localizedPath(locale: SupportedLocale, path = "/"): string {
  const suffix = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;

  return `/${locale}${suffix}`;
}

/**
 * Splits `/pt/blog/foo` into `{ locale: "pt", path: "/blog/foo" }`.
 * Returns a null locale when the first segment is not one — that is how the
 * router tells an unprefixed legacy URL from a real one.
 */
export function splitLocalePath(pathname: string): {
  locale: SupportedLocale | null;
  path: string;
} {
  const [, first = "", ...rest] = pathname.split("/");

  if (!isSupportedLocale(first)) {
    return { locale: null, path: pathname === "" ? "/" : pathname };
  }

  return { locale: first, path: rest.length ? `/${rest.join("/")}` : "/" };
}
