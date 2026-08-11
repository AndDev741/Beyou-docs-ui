import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18nRouting";

import translationEn from "./en/translation.json";
import translationPt from "./pt/translation.json";

/**
 * No LanguageDetector on purpose.
 *
 * The locale is a path segment now, and LocaleLayout pushes it into i18next on
 * every navigation. A detector on top of that is a second, competing source of
 * truth: it would happily render Portuguese under /en/ for a browser set to
 * pt-BR, which is a crawler being served content that contradicts the page's own
 * canonical and hreflang. Browser preference still gets a say — it just decides
 * once, in detectPreferredLocale(), when resolving a bare `/`.
 */
i18next.use(initReactI18next).init({
  resources: {
    en: { translation: translationEn },
    pt: { translation: translationPt },
  },
  supportedLngs: [...SUPPORTED_LOCALES],
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  debug: false,
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
