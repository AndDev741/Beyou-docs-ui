import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { SeoProps } from "@/components/seo/Seo";
import { useLocale } from "@/hooks/useLocale";
import { STATIC_ROUTES, buildCanonical } from "@/lib/seo/routes";
import { resolveSiteUrl } from "@/lib/seo/siteConfig";
import { breadcrumbSchema, websiteSchema } from "@/lib/seo/structuredData";

/**
 * Metadata for the pages that are not collection views.
 *
 * `translationKey` is looked up in STATIC_ROUTES rather than passed loose, so a
 * page cannot quietly describe itself with a key the sitemap knows nothing
 * about — the noIndex flag in particular has to agree between the two, or a page
 * gets submitted in the sitemap and then refuses to be indexed.
 */
export function useStaticSeo(translationKey: string): SeoProps {
  const { t } = useTranslation();
  const locale = useLocale();
  const siteUrl = resolveSiteUrl(import.meta.env.VITE_SITE_URL as string | undefined);

  return useMemo(() => {
    const route = STATIC_ROUTES.find((entry) => entry.translationKey === translationKey);

    if (!route) {
      throw new Error(
        `No STATIC_ROUTES entry for "${translationKey}". Add it there so the router, ` +
          "the sitemap and the prerenderer stay in agreement.",
      );
    }

    const title = t(`seo.pages.${translationKey}.title`);
    const description = t(`seo.pages.${translationKey}.description`);
    const canonical = buildCanonical(siteUrl, locale, route.path);

    // The home page describes the site itself; every other page just needs a
    // trail back to it.
    const structuredData =
      route.path === "/"
        ? websiteSchema(siteUrl, locale, description)
        : breadcrumbSchema([
            { name: t("nav.home"), url: buildCanonical(siteUrl, locale, "/") },
            { name: title, url: canonical },
          ]);

    return {
      title,
      description,
      noIndex: !route.indexable,
      type: "website" as const,
      structuredData,
    };
  }, [locale, siteUrl, t, translationKey]);
}
