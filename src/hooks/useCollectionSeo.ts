import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { SeoProps } from "@/components/seo/Seo";
import { useLocale } from "@/hooks/useLocale";
import { parseTags } from "@/lib/projectApi";
import { buildCanonical, encodeTopicKey, type DocsCollection } from "@/lib/seo/routes";
import { OG_IMAGE_PATH, absoluteUrl, resolveSiteUrl } from "@/lib/seo/siteConfig";
import { articleSchema, breadcrumbSchema, excerptFromMarkdown } from "@/lib/seo/structuredData";

/**
 * The four collection pages (blog, architecture, apis, projects) all present the
 * same two states — an index and a detail — and need the same SEO treatment for
 * each. This holds the one copy of that logic.
 */

/** The subset of a topic payload that matters for metadata, across all four. */
export interface CollectionSeoTopic {
  title?: string | null;
  summary?: string | null;
  docMarkdown?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author?: string | null;
  /** JSON-encoded array, as the API returns it. */
  tags?: string | null;
}

export interface CollectionSeoInput {
  collection: DocsCollection;
  /** Null on the index route. */
  detailKey: string | null;
  /** The loaded detail, or null while it is still in flight. */
  detail: CollectionSeoTopic | null;
  /** The matching list entry, used to fill the gap before the detail lands. */
  listEntry?: CollectionSeoTopic | null;
}

export function useCollectionSeo({
  collection,
  detailKey,
  detail,
  listEntry,
}: CollectionSeoInput): SeoProps {
  const { t } = useTranslation();
  const locale = useLocale();
  const siteUrl = resolveSiteUrl(import.meta.env.VITE_SITE_URL as string | undefined);

  return useMemo(() => {
    const sectionName = t(`nav.${collection.translationKey}`);
    const homeCrumb = { name: t("nav.home"), url: buildCanonical(siteUrl, locale, "/") };
    const sectionCrumb = {
      name: sectionName,
      url: buildCanonical(siteUrl, locale, collection.basePath),
    };

    const index: SeoProps = {
      title: t(`seo.pages.${collection.translationKey}.title`),
      description: t(`seo.pages.${collection.translationKey}.description`),
      type: "website",
      structuredData: breadcrumbSchema([homeCrumb, sectionCrumb]),
    };

    if (!detailKey) return index;

    // A detail route always arrives before its payload. Describing it as the
    // index page for that window would publish the wrong title under the post's
    // canonical, so fall back to the list entry and only then to the index.
    const title = detail?.title ?? listEntry?.title;
    if (!title) return index;

    const description =
      listEntry?.summary?.trim() ||
      detail?.summary?.trim() ||
      (detail?.docMarkdown ? excerptFromMarkdown(detail.docMarkdown) : "") ||
      index.description;

    const canonical = buildCanonical(
      siteUrl,
      locale,
      `${collection.basePath}/${encodeTopicKey(detailKey)}`,
    );
    const publishedAt = detail?.publishedAt ?? listEntry?.publishedAt ?? null;
    const updatedAt = detail?.updatedAt ?? listEntry?.updatedAt ?? null;

    return {
      title,
      description,
      type: "article",
      publishedTime: publishedAt,
      modifiedTime: updatedAt,
      structuredData: [
        articleSchema({
          title,
          description,
          canonical,
          siteUrl,
          locale,
          schemaType: collection.schemaType,
          publishedAt,
          updatedAt,
          author: detail?.author ?? listEntry?.author,
          tags: parseTags(detail?.tags ?? listEntry?.tags ?? ""),
          imageUrl: absoluteUrl(siteUrl, OG_IMAGE_PATH),
        }),
        breadcrumbSchema([homeCrumb, sectionCrumb, { name: title, url: canonical }]),
      ],
    };
  }, [collection, detail, detailKey, listEntry, locale, siteUrl, t]);
}
