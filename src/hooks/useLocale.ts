import { useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";

import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  localizedPath,
  splitLocalePath,
  type SupportedLocale,
} from "@/lib/i18nRouting";

/**
 * The active locale, read from the `:lang` route segment.
 *
 * Pages used to derive this from `i18n.language`, which is a detector value and
 * can disagree with the URL. Reading the segment means the rendered language and
 * the canonical URL can never drift apart.
 */
export function useLocale(): SupportedLocale {
  const { lang } = useParams<{ lang: string }>();

  return isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;
}

/**
 * Turns a locale-free path into one for the current locale: `/blog` -> `/pt/blog`.
 * Links are written without a locale so they keep working in either language.
 */
export function useLocalizedPath(): (path: string) => string {
  const locale = useLocale();

  return useCallback((path: string) => localizedPath(locale, path), [locale]);
}

/**
 * The current page's path with the locale stripped — what the language switcher
 * needs in order to send you to the same page in the other language rather than
 * back to the home page.
 */
export function useLocaleFreePath(): string {
  const location = useLocation();

  return splitLocalePath(location.pathname).path;
}
