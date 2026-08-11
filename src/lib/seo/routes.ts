import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  localizedPath,
  type SupportedLocale,
} from "../i18nRouting";
import { absoluteUrl } from "./siteConfig";

/**
 * The one description of what pages exist.
 *
 * The router, the sitemap and the prerender step all read from here. Keeping
 * them on separate lists is how a page ends up live but missing from the
 * sitemap, or prerendered under a path the router does not serve — both fail
 * silently and only show up as missing traffic weeks later.
 *
 * Imported by a Node script as well as by the app, so: no `import.meta`, no
 * `process`, no React.
 */

export interface StaticRoute {
  /** Locale-free, e.g. "/blog". The locale segment is added when rendering. */
  path: string;
  /** Key under `seo.pages` in translation.json. */
  translationKey: string;
  /** False keeps it out of the sitemap and adds a robots noindex. */
  indexable: boolean;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}

export const STATIC_ROUTES: StaticRoute[] = [
  { path: "/", translationKey: "home", indexable: true, priority: 1.0, changeFrequency: "weekly" },
  { path: "/getting-started", translationKey: "gettingStarted", indexable: true, priority: 0.8, changeFrequency: "monthly" },
  { path: "/architecture", translationKey: "architecture", indexable: true, priority: 0.9, changeFrequency: "weekly" },
  { path: "/blog", translationKey: "blog", indexable: true, priority: 0.9, changeFrequency: "daily" },
  { path: "/apis", translationKey: "apis", indexable: true, priority: 0.8, changeFrequency: "weekly" },
  { path: "/projects", translationKey: "projects", indexable: true, priority: 0.8, changeFrequency: "weekly" },
  // Both are pure UI over content indexed elsewhere. Letting them in would
  // spend crawl budget on infinite query permutations and near-duplicate pages.
  { path: "/search", translationKey: "search", indexable: false, priority: 0.1, changeFrequency: "monthly" },
  { path: "/settings", translationKey: "settings", indexable: false, priority: 0.1, changeFrequency: "monthly" },
];

/** schema.org type for the detail pages of a collection. */
export type CollectionSchemaType = "BlogPosting" | "TechArticle";

export interface DocsCollection {
  name: "blog" | "architecture" | "apis" | "projects";
  /** Locale-free base, e.g. "/blog" — detail pages are `${basePath}/${key}`. */
  basePath: string;
  /** API path, relative to the API base URL. */
  listApiPath: string;
  detailApiPath: (key: string) => string;
  /** Field holding the list payload's stable identifier. */
  schemaType: CollectionSchemaType;
  translationKey: string;
  priority: number;
}

export const DOCS_COLLECTIONS: DocsCollection[] = [
  {
    name: "blog",
    basePath: "/blog",
    listApiPath: "/docs/blog/topics",
    detailApiPath: (key) => `/docs/blog/topics/${encodeURIComponent(key)}`,
    schemaType: "BlogPosting",
    translationKey: "blog",
    priority: 0.8,
  },
  {
    name: "architecture",
    basePath: "/architecture",
    listApiPath: "/docs/architecture/topics",
    detailApiPath: (key) => `/docs/architecture/topics/${encodeURIComponent(key)}`,
    schemaType: "TechArticle",
    translationKey: "architecture",
    priority: 0.7,
  },
  {
    name: "apis",
    basePath: "/apis",
    listApiPath: "/docs/api/controllers",
    detailApiPath: (key) => `/docs/api/controllers/${encodeURIComponent(key)}`,
    schemaType: "TechArticle",
    translationKey: "apis",
    priority: 0.6,
  },
  {
    name: "projects",
    basePath: "/projects",
    listApiPath: "/docs/projects/topics",
    detailApiPath: (key) => `/docs/projects/topics/${encodeURIComponent(key)}`,
    schemaType: "TechArticle",
    translationKey: "projects",
    priority: 0.7,
  },
];

export function findCollection(name: string): DocsCollection | undefined {
  return DOCS_COLLECTIONS.find((collection) => collection.name === name);
}

/**
 * Percent-encodes a topic key for use as a path segment, but leaves `+` alone.
 *
 * `+` is a literal plus inside a path (only a query string reads it as a space),
 * so `/blog/n+1-problem-solved` and `/blog/n%2B1-problem-solved` are both valid
 * and both resolve to the same page — which is duplicate content unless one of
 * them is picked and used everywhere. The unescaped form is the readable one, so
 * that is the canonical, and it is what the prerenderer names the file on disk.
 */
export function encodeTopicKey(key: string): string {
  return encodeURIComponent(key).replace(/%2B/g, "+");
}

export function collectionDetailPath(collection: DocsCollection, key: string): string {
  return `${collection.basePath}/${encodeTopicKey(key)}`;
}

export interface AlternateLink {
  /** hreflang value — a locale, or "x-default". */
  hrefLang: string;
  href: string;
}

/**
 * Every page links to all of its language variants plus an x-default.
 *
 * x-default is what a searcher with no matching language preference gets, so it
 * points at English rather than at the bare `/`, which only redirects.
 */
export function buildAlternates(siteUrl: string, path: string): AlternateLink[] {
  const alternates: AlternateLink[] = SUPPORTED_LOCALES.map((locale) => ({
    hrefLang: locale,
    href: absoluteUrl(siteUrl, localizedPath(locale, path)),
  }));

  alternates.push({
    hrefLang: "x-default",
    href: absoluteUrl(siteUrl, localizedPath(DEFAULT_LOCALE, path)),
  });

  return alternates;
}

export function buildCanonical(siteUrl: string, locale: SupportedLocale, path: string): string {
  return absoluteUrl(siteUrl, localizedPath(locale, path));
}
