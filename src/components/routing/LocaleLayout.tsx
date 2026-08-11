import { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18nRouting";
import { LocaleRedirect } from "./LocaleRedirect";

/**
 * Guards the `/:lang` branch of the router and makes the URL the single source
 * of truth for language.
 *
 * `:lang` matches any first segment, so an un-prefixed `/blog` arrives here with
 * lang="blog". That is not an error to bounce home — it is a link written before
 * locales moved into the path, and the path still has to survive. Handing it to
 * LocaleRedirect keeps one implementation of "add a locale to this URL",
 * including the legacy query-param rewrites.
 */
export function LocaleLayout() {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  const isKnownLocale = isSupportedLocale(lang);
  const locale = isKnownLocale ? lang : DEFAULT_LOCALE;

  useEffect(() => {
    if (!isKnownLocale) return;

    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }

    // Screen readers and translation tooling both key off this, and it is the
    // attribute crawlers read to confirm the page really is in the language its
    // hreflang claims.
    document.documentElement.lang = locale;
  }, [i18n, isKnownLocale, locale]);

  if (!isKnownLocale) {
    return <LocaleRedirect />;
  }

  return <Outlet />;
}
