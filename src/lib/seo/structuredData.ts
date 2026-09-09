import { APP_URL, ORGANIZATION_NAME, PLAY_STORE_URL, SITE_NAME, absoluteUrl } from "./siteConfig";
import type { CollectionSchemaType } from "./routes";

/**
 * JSON-LD builders shared by the runtime <Seo> component and the prerender step.
 *
 * They have to agree: a crawler reads the prerendered markup, then a rendering
 * pass reads what React produced. Two different graphs for one URL is a reason
 * for the structured data to be dropped entirely, so both sides call these.
 *
 * No React and no bundler globals here — a Node script imports this file too.
 */

export interface ArticleSchemaInput {
  title: string;
  description: string;
  canonical: string;
  siteUrl: string;
  locale: string;
  schemaType: CollectionSchemaType;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author?: string | null;
  tags?: string[];
  imageUrl?: string;
}

export function articleSchema(input: ArticleSchemaInput): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.schemaType,
    headline: input.title,
    description: input.description,
    inLanguage: input.locale,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.canonical },
    url: input.canonical,
    author: {
      "@type": "Person",
      name: input.author?.trim() || ORGANIZATION_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: ORGANIZATION_NAME,
      url: input.siteUrl,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(input.siteUrl, "/favicon.svg"),
      },
    },
  };

  if (input.imageUrl) schema.image = [input.imageUrl];
  if (input.publishedAt) schema.datePublished = input.publishedAt;
  // Falling back to datePublished keeps dateModified from being absent, which
  // some validators flag on Article types.
  schema.dateModified = input.updatedAt || input.publishedAt || undefined;
  if (input.tags?.length) schema.keywords = input.tags.join(", ");

  return schema;
}

export interface BreadcrumbEntry {
  name: string;
  url: string;
}

/**
 * Gives search results the `Docs > Blog > Post` trail instead of a bare URL.
 */
export function breadcrumbSchema(entries: BreadcrumbEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.url,
    })),
  };
}

/**
 * Home page only. Declares what the site is and what it documents, which is what
 * ties the docs domain to the product for an engine building an entity graph.
 */
export function websiteSchema(siteUrl: string, locale: string, description: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description,
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: ORGANIZATION_NAME,
      url: siteUrl,
      sameAs: [APP_URL, PLAY_STORE_URL, "https://github.com/AndDev741"],
    },
    about: {
      "@type": "SoftwareApplication",
      name: ORGANIZATION_NAME,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web, Android",
      url: APP_URL,
      installUrl: PLAY_STORE_URL,
    },
  };
}

/**
 * Turns markdown into a one-paragraph plain-text summary for a meta description.
 *
 * Only used when a topic has no summary of its own. Search engines show roughly
 * 155 characters, and a description cut mid-word looks broken, so it trims back
 * to a word boundary.
 */
export function excerptFromMarkdown(markdown: string, maxLength = 155): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep their text
    .replace(/^\s{0,3}#{1,6}\s+/gm, " ") // heading markers
    .replace(/^\s{0,3}>\s?/gm, " ") // block quotes
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, " ") // list markers
    .replace(/[*_`~]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");

  return `${(lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}...`;
}
