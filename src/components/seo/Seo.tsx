import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { useLocale, useLocaleFreePath } from "@/hooks/useLocale";
import { SUPPORTED_LOCALES } from "@/lib/i18nRouting";
import { buildAlternates, buildCanonical } from "@/lib/seo/routes";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  absoluteUrl,
  resolveSiteUrl,
} from "@/lib/seo/siteConfig";

const SITE_URL = resolveSiteUrl(import.meta.env.VITE_SITE_URL as string | undefined);

/** OpenGraph locale codes are `language_TERRITORY`, not bare language tags. */
const OG_LOCALE: Record<string, string> = {
  en: "en_US",
  pt: "pt_BR",
};

export interface SeoProps {
  /** Page title without the site suffix — the template adds it. */
  title: string;
  description: string;
  /** Keeps a page out of the index while still letting crawlers follow its links. */
  noIndex?: boolean;
  /** "article" for a blog post or a docs topic; anything else stays a website. */
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  /** Rendered verbatim into a ld+json script tag. */
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

export function Seo({
  title,
  description,
  noIndex = false,
  type = "website",
  publishedTime,
  modifiedTime,
  structuredData,
}: SeoProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const path = useLocaleFreePath();

  const canonical = buildCanonical(SITE_URL, locale, path);
  const alternates = buildAlternates(SITE_URL, path);
  const fullTitle = t("seo.titleTemplate", { title, defaultValue: `${title} | ${SITE_NAME}` });
  const imageUrl = absoluteUrl(SITE_URL, OG_IMAGE_PATH);

  const payload = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  return (
    <Helmet>
      <html lang={locale} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* A noindex page still needs a canonical: it can be linked to, and
          "follow" lets its links pass through to pages that should rank. */}
      <link rel="canonical" href={canonical} />
      {noIndex ? <meta name="robots" content="noindex, follow" /> : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
      )}

      {alternates.map((alternate) => (
        <link
          key={alternate.hrefLang}
          rel="alternate"
          hrefLang={alternate.hrefLang}
          href={alternate.href}
        />
      ))}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
      <meta property="og:locale" content={OG_LOCALE[locale] ?? OG_LOCALE.en} />
      {SUPPORTED_LOCALES.filter((other) => other !== locale).map((other) => (
        <meta key={other} property="og:locale:alternate" content={OG_LOCALE[other]} />
      ))}

      {type === "article" && publishedTime ? (
        <meta property="article:published_time" content={publishedTime} />
      ) : null}
      {type === "article" && modifiedTime ? (
        <meta property="article:modified_time" content={modifiedTime} />
      ) : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Keyed by schema type: a page emits at most one graph of each
          (an article and its breadcrumbs), so the type is stable across
          renders in a way an array index is not. */}
      {payload.map((entry) => (
        <script key={String(entry["@type"] ?? "schema")} type="application/ld+json">
          {JSON.stringify(entry)}
        </script>
      ))}
    </Helmet>
  );
}

