/**
 * Turns the built SPA into a set of real HTML pages.
 *
 * WHY THIS EXISTS
 * The app renders entirely in the browser and pulls its content from the docs
 * API at runtime, so the HTML that leaves the server is an empty <div id="root">.
 * Googlebot will execute the JavaScript eventually, but Bing, LinkedIn, Slack,
 * GPTBot, ClaudeBot and PerplexityBot will not — for them the entire site is a
 * blank page. For a site whose whole job is to show engineering work, being
 * unreadable to the crawlers that feed AI answers is the expensive failure.
 *
 * WHAT IT DOES
 * Fetches every topic in every locale from the same public API the app uses,
 * then writes one HTML file per route containing the real title, description,
 * canonical, hreflang, OpenGraph tags, JSON-LD and the article text itself. The
 * SPA still boots on top and takes over — this only changes what a client sees
 * before JavaScript runs.
 *
 * WHY NOT READ THE MARKDOWN FROM THIS REPO
 * The markdown here is a copy. The API is fed from beyou-arch-design, and the
 * running app reads the API — so the API is what users actually see. Prerendering
 * from the local copy would silently publish different text than the page shows
 * the moment the two drift.
 */

import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, localizedPath, type SupportedLocale } from "../src/lib/i18nRouting.js";
import {
  DOCS_COLLECTIONS,
  STATIC_ROUTES,
  buildAlternates,
  buildCanonical,
  encodeTopicKey,
  type DocsCollection,
} from "../src/lib/seo/routes.js";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  absoluteUrl,
  resolveApiBaseUrl,
  resolveSiteUrl,
} from "../src/lib/seo/siteConfig.js";
import {
  articleSchema,
  breadcrumbSchema,
  excerptFromMarkdown,
  websiteSchema,
} from "../src/lib/seo/structuredData.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");

const SITE_URL = resolveSiteUrl(process.env.SITE_URL);
const API_BASE_URL = resolveApiBaseUrl(process.env.PRERENDER_API_URL);

/** A slow docs API should fail the build, not hang the runner. */
const FETCH_TIMEOUT_MS = 20_000;

const OG_LOCALE: Record<SupportedLocale, string> = { en: "en_US", pt: "pt_BR" };

interface TopicListItem {
  key: string;
  title: string;
  summary?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author?: string | null;
  tags?: string | null;
}

interface TopicDetail extends TopicListItem {
  docMarkdown?: string | null;
}

interface Translations {
  seo: {
    titleTemplate: string;
    pages: Record<string, { title: string; description: string }>;
  };
  nav: Record<string, string>;
}

/** Collected as we go so the sitemap can only ever list pages that were written. */
interface WrittenPage {
  path: string;
  locale: SupportedLocale;
  priority: number;
  changeFrequency: string;
  lastModified?: string | null;
}

const written: WrittenPage[] = [];

/* ── html escaping ───────────────────────────────────────── */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * JSON-LD goes inside a <script> element, where the parser looks for `</script`
 * before it looks at JSON syntax. A topic containing that string in a code block
 * would otherwise close the tag early and spill the rest of the graph into the
 * page as text. `<!--` gets the same treatment for the same reason.
 */
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\/(script)/gi, "<\\/$1")
    .replace(/<!--/g, "\\u003C!--");
}

/* ── api ─────────────────────────────────────────────────── */

/**
 * The docs endpoints are rate limited to 30 requests per minute per IP
 * (RateLimitConfig.createDocsBucket). A full prerender is ~74 requests, so
 * firing them back to back gets a 429 partway through and fails the build.
 *
 * Pacing below the limit rather than raising it server-side: the cap protects a
 * public endpoint from anonymous traffic, and a build is just another client.
 * The margin absorbs the fact that the bucket refills greedily and CI may share
 * an egress IP with something else.
 */
const REQUESTS_PER_MINUTE = 24;
const MIN_REQUEST_SPACING_MS = Math.ceil(60_000 / REQUESTS_PER_MINUTE);
const MAX_RETRIES = 4;

let nextRequestAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextRequestAt - now);

  if (wait > 0) await sleep(wait);

  nextRequestAt = Math.max(now, nextRequestAt) + MIN_REQUEST_SPACING_MS;
}

async function fetchJson<T>(path: string, locale: SupportedLocale): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  url.searchParams.set("locale", locale);

  for (let attempt = 0; ; attempt++) {
    await throttle();

    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });

    if (response.ok) return (await response.json()) as T;

    // The server tells us exactly how long to wait; guessing would either stall
    // the build or hammer straight back into the limit.
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? (retryAfter + 1) * 1000
        : 2 ** attempt * 1000;

      console.warn(`  rate limited, retrying in ${Math.round(backoffMs / 1000)}s: ${path}`);
      await sleep(backoffMs);
      nextRequestAt = Date.now() + MIN_REQUEST_SPACING_MS;
      continue;
    }

    throw new Error(await describeFailure(response, url));
  }
}

/**
 * Failures here stop a release, so the message has to point at the actual cause.
 *
 * The docs endpoints are permitAll in SecurityConfig, so the backend has no path
 * that answers a plain GET with 401/403. When one shows up it came from the edge
 * in front of the API, not the application -- Cloudflare's bot protection blocks
 * datacenter IPs by default, and CI runners are datacenter IPs. A bare
 * "403 Forbidden" sent the first investigation of this at the backend, which had
 * never even seen the request.
 */
async function describeFailure(response: Response, url: URL): Promise<string> {
  const base = `${response.status} ${response.statusText || "(no status text)"} for ${url}`;

  if (response.status !== 401 && response.status !== 403) return base;

  // Which Cloudflare mechanism blocked this is the one thing that decides the
  // fix, and it is only in the response body: its block page carries an error
  // code (1020 access denied by a rule, 1015 rate limited, 1010 browser
  // signature) plus a Ray ID that can be looked up in the dashboard. `server:
  // cloudflare` is on every response through the zone, successful ones included,
  // so it identifies nothing on its own.
  const rayId = response.headers.get("cf-ray") ?? "(none)";
  const body = await response.text().catch(() => "");
  const errorCode = body.match(/Error\s*(\d{4})/i)?.[1];
  const snippet = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

  return [
    base,
    `  cf-ray: ${rayId}`,
    errorCode ? `  Cloudflare error ${errorCode}` : "",
    "  These endpoints are permitAll -- the backend does not reject anonymous",
    "  GETs, so a 401/403 was produced in front of it. The same URL answers 200",
    "  from other clients, so this is about who is asking, not what is asked:",
    "  bot protection scoring a CI runner's datacenter IP is the usual cause.",
    "  Fix at the edge, or point PRERENDER_API_URL at an API that does not sit",
    "  behind it.",
    snippet ? `  body: ${snippet}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ── page template ───────────────────────────────────────── */

interface PageInput {
  locale: SupportedLocale;
  /** Locale-free path, e.g. "/blog/foo". */
  path: string;
  title: string;
  description: string;
  noIndex: boolean;
  type: "website" | "article";
  bodyHtml: string;
  structuredData: unknown[];
  publishedAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Builds the <head> for one page and injects it, plus the rendered body, into
 * the built index.html.
 */
function renderPage(shell: string, input: PageInput): string {
  const canonical = buildCanonical(SITE_URL, input.locale, input.path);
  const alternates = buildAlternates(SITE_URL, input.path);
  const imageUrl = absoluteUrl(SITE_URL, OG_IMAGE_PATH);
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);

  const head = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    input.noIndex
      ? `<meta name="robots" content="noindex, follow" />`
      : `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    ...alternates.map(
      (alternate) =>
        `<link rel="alternate" hreflang="${alternate.hrefLang}" href="${alternate.href}" />`,
    ),
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:type" content="${input.type}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[input.locale]}" />`,
    ...SUPPORTED_LOCALES.filter((other) => other !== input.locale).map(
      (other) => `<meta property="og:locale:alternate" content="${OG_LOCALE[other]}" />`,
    ),
    input.type === "article" && input.publishedAt
      ? `<meta property="article:published_time" content="${escapeHtml(input.publishedAt)}" />`
      : "",
    input.type === "article" && input.updatedAt
      ? `<meta property="article:modified_time" content="${escapeHtml(input.updatedAt)}" />`
      : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
    ...input.structuredData.map(
      (entry) => `<script type="application/ld+json">${safeJsonLd(entry)}</script>`,
    ),
  ]
    .filter(Boolean)
    .join("\n    ");

  let html = shell;

  // The shell's own title and description describe the site generically; leaving
  // them in would give every page two of each and let the crawler pick.
  html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, "");
  html = html.replace(/<meta\s+name="description"[^>]*>\s*/i, "");
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, "");
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, "");

  html = html.replace("<html lang=\"en\">", `<html lang="${input.locale}">`);
  html = html.replace("</head>", `  ${head}\n  </head>`);

  // React mounts with createRoot, which clears the container on first render --
  // so this markup is what non-JS clients read, and what a browser paints while
  // the bundle downloads. It is replaced, never hydrated, so there is no
  // mismatch to reconcile.
  html = html.replace('<div id="root"></div>', `<div id="root">${input.bodyHtml}</div>`);

  return html;
}

/* ── body rendering ──────────────────────────────────────── */

marked.setOptions({ gfm: true, breaks: false });

async function renderMarkdown(markdown: string): Promise<string> {
  return marked.parse(markdown) as string | Promise<string>;
}

/**
 * The crawler-facing body: a heading, the article text, and links onward.
 *
 * `.prerender-shell` is styled to be invisible-but-present rather than
 * display:none — content hidden with CSS is discounted by search engines, and
 * hiding text a crawler is meant to read is exactly the pattern that gets a site
 * penalised for cloaking. It sits in normal flow and is simply replaced the
 * instant React mounts.
 */
function articleBody(title: string, contentHtml: string, breadcrumbHtml: string): string {
  return [
    `<div class="prerender-shell">`,
    breadcrumbHtml,
    `<h1>${escapeHtml(title)}</h1>`,
    contentHtml,
    `</div>`,
  ].join("\n");
}

function listBody(
  title: string,
  description: string,
  locale: SupportedLocale,
  collection: DocsCollection,
  topics: TopicListItem[],
): string {
  const items = topics
    .map((topic) => {
      const href = localizedPath(
        locale,
        `${collection.basePath}/${encodeTopicKey(topic.key)}`,
      );
      const summary = topic.summary?.trim();

      return [
        `<li>`,
        `<a href="${href}">${escapeHtml(topic.title)}</a>`,
        summary ? `<p>${escapeHtml(summary)}</p>` : "",
        `</li>`,
      ]
        .filter(Boolean)
        .join("");
    })
    .join("\n");

  return [
    `<div class="prerender-shell">`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(description)}</p>`,
    // Real anchors, so a crawler that does not run JavaScript can still reach
    // every detail page. Without these the detail pages would exist but be
    // discoverable only through the sitemap.
    `<ul>${items}</ul>`,
    `</div>`,
  ].join("\n");
}

function breadcrumbHtml(entries: { name: string; url: string }[]): string {
  const links = entries
    .map((entry, index) =>
      index === entries.length - 1
        ? `<span>${escapeHtml(entry.name)}</span>`
        : `<a href="${entry.url}">${escapeHtml(entry.name)}</a>`,
    )
    .join(" / ");

  return `<nav aria-label="Breadcrumb">${links}</nav>`;
}

/* ── writing ─────────────────────────────────────────────── */

async function writePage(relativePath: string, html: string): Promise<void> {
  // Directory + index.html rather than `<name>.html` so the canonical URL has no
  // extension and nginx can serve it with a plain try_files.
  const target = join(DIST, relativePath.replace(/^\//, ""), "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

/* ── main ────────────────────────────────────────────────── */

async function loadTranslations(locale: SupportedLocale): Promise<Translations> {
  const raw = await readFile(join(ROOT, "src", "translations", locale, "translation.json"), "utf8");

  return JSON.parse(raw) as Translations;
}

function applyTitleTemplate(template: string, title: string): string {
  return template.includes("{{title}}") ? template.replace("{{title}}", title) : `${title} | ${SITE_NAME}`;
}

async function prerenderLocale(
  shell: string,
  locale: SupportedLocale,
): Promise<void> {
  const translations = await loadTranslations(locale);
  const { seo, nav } = translations;
  const homeCrumb = { name: nav.home, url: buildCanonical(SITE_URL, locale, "/") };

  /* static pages */
  for (const route of STATIC_ROUTES) {
    const page = seo.pages[route.translationKey];
    if (!page) {
      throw new Error(
        `Missing seo.pages.${route.translationKey} in ${locale} translations — ` +
          "STATIC_ROUTES and the translation files have drifted.",
      );
    }

    const canonical = buildCanonical(SITE_URL, locale, route.path);
    const structuredData =
      route.path === "/"
        ? [websiteSchema(SITE_URL, locale, page.description)]
        : [breadcrumbSchema([homeCrumb, { name: page.title, url: canonical }])];

    // Collection landing pages get their real list rendered below; this covers
    // the rest.
    const isCollectionRoot = DOCS_COLLECTIONS.some((c) => c.basePath === route.path);
    if (isCollectionRoot) continue;

    await writePage(
      localizedPath(locale, route.path),
      renderPage(shell, {
        locale,
        path: route.path,
        title: applyTitleTemplate(seo.titleTemplate, page.title),
        description: page.description,
        noIndex: !route.indexable,
        type: "website",
        bodyHtml: [
          `<div class="prerender-shell">`,
          `<h1>${escapeHtml(page.title)}</h1>`,
          `<p>${escapeHtml(page.description)}</p>`,
          `</div>`,
        ].join("\n"),
        structuredData,
      }),
    );

    if (route.indexable) {
      written.push({
        path: localizedPath(locale, route.path),
        locale,
        priority: route.priority,
        changeFrequency: route.changeFrequency,
      });
    }
  }

  /* collections: the landing page plus every topic */
  for (const collection of DOCS_COLLECTIONS) {
    const page = seo.pages[collection.translationKey];
    const staticRoute = STATIC_ROUTES.find((route) => route.path === collection.basePath)!;
    const topics = await fetchJson<TopicListItem[]>(collection.listApiPath, locale);

    if (topics.length === 0) {
      throw new Error(
        `${collection.name} returned no topics for locale "${locale}". Refusing to ` +
          "publish an empty section — run the docs import before building.",
      );
    }

    const sectionCanonical = buildCanonical(SITE_URL, locale, collection.basePath);
    const sectionCrumb = { name: nav[collection.translationKey], url: sectionCanonical };

    await writePage(
      localizedPath(locale, collection.basePath),
      renderPage(shell, {
        locale,
        path: collection.basePath,
        title: applyTitleTemplate(seo.titleTemplate, page.title),
        description: page.description,
        noIndex: false,
        type: "website",
        bodyHtml: listBody(page.title, page.description, locale, collection, topics),
        structuredData: [breadcrumbSchema([homeCrumb, sectionCrumb])],
      }),
    );

    written.push({
      path: localizedPath(locale, collection.basePath),
      locale,
      priority: staticRoute.priority,
      changeFrequency: staticRoute.changeFrequency,
    });

    for (const topic of topics) {
      const detail = await fetchJson<TopicDetail>(
        collection.detailApiPath(topic.key),
        locale,
      );

      const markdown = detail.docMarkdown ?? "";
      const description =
        topic.summary?.trim() ||
        detail.summary?.trim() ||
        (markdown ? excerptFromMarkdown(markdown) : "") ||
        page.description;

      const path = `${collection.basePath}/${encodeTopicKey(topic.key)}`;
      const canonical = buildCanonical(SITE_URL, locale, path);
      const tags = parseTagsJson(detail.tags ?? topic.tags);

      const crumbs = [homeCrumb, sectionCrumb, { name: detail.title, url: canonical }];

      await writePage(
        localizedPath(locale, path),
        renderPage(shell, {
          locale,
          path,
          title: applyTitleTemplate(seo.titleTemplate, detail.title),
          description,
          noIndex: false,
          type: "article",
          publishedAt: detail.publishedAt ?? topic.publishedAt,
          updatedAt: detail.updatedAt ?? topic.updatedAt,
          bodyHtml: articleBody(
            detail.title,
            await renderMarkdown(markdown),
            breadcrumbHtml(crumbs),
          ),
          structuredData: [
            articleSchema({
              title: detail.title,
              description,
              canonical,
              siteUrl: SITE_URL,
              locale,
              schemaType: collection.schemaType,
              publishedAt: detail.publishedAt ?? topic.publishedAt,
              updatedAt: detail.updatedAt ?? topic.updatedAt,
              author: detail.author ?? topic.author,
              tags,
              imageUrl: absoluteUrl(SITE_URL, OG_IMAGE_PATH),
            }),
            breadcrumbSchema(crumbs),
          ],
        }),
      );

      written.push({
        path: localizedPath(locale, path),
        locale,
        priority: collection.priority,
        changeFrequency: "monthly",
        lastModified: detail.updatedAt ?? topic.updatedAt,
      });
    }

    console.log(`  ${locale}/${collection.name}: ${topics.length} topics`);
  }
}

/** Tags arrive as a JSON-encoded array; a malformed value must not fail a build. */
function parseTagsJson(raw?: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function buildSitemap(): string {
  const entries = written
    .map((entry) => {
      const loc = absoluteUrl(SITE_URL, entry.path);
      const alternates = SUPPORTED_LOCALES.map((locale) => {
        const path = entry.path.replace(/^\/[a-z]{2}/, `/${locale}`);
        return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${absoluteUrl(SITE_URL, path)}" />`;
      }).join("\n");

      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        entry.lastModified ? `    <lastmod>${entry.lastModified.slice(0, 10)}</lastmod>` : "",
        `    <changefreq>${entry.changeFrequency}</changefreq>`,
        `    <priority>${entry.priority.toFixed(1)}</priority>`,
        alternates,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

function buildRobots(): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "# Pure UI over content indexed elsewhere; crawling them only burns budget",
    "# on query permutations.",
    "Disallow: /*/search",
    "Disallow: /*/settings",
    "",
    `Sitemap: ${absoluteUrl(SITE_URL, "/sitemap.xml")}`,
    "",
  ].join("\n");
}

/**
 * llms.txt — a plain-text index for the crawlers behind AI assistants, which
 * fetch documentation far more readily than they execute a SPA.
 */
function buildLlmsTxt(pages: WrittenPage[]): string {
  const byLocale = SUPPORTED_LOCALES.map((locale) => {
    const links = pages
      .filter((page) => page.locale === locale)
      .map((page) => `- ${absoluteUrl(SITE_URL, page.path)}`)
      .join("\n");

    return `## ${locale}\n\n${links}`;
  }).join("\n\n");

  return [
    `# ${SITE_NAME}`,
    "",
    "> Engineering documentation for the Beyou habit-tracking app: system",
    "> architecture, REST API reference, project write-ups and build notes.",
    "",
    byLocale,
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  try {
    await access(join(DIST, "index.html"));
  } catch {
    throw new Error("dist/index.html not found — run `vite build` before prerendering.");
  }

  const shell = await readFile(join(DIST, "index.html"), "utf8");

  console.log(`Prerendering from ${API_BASE_URL} into ${SITE_URL}`);

  for (const locale of SUPPORTED_LOCALES) {
    await prerenderLocale(shell, locale);
  }

  await writeFile(join(DIST, "sitemap.xml"), buildSitemap(), "utf8");
  await writeFile(join(DIST, "robots.txt"), buildRobots(), "utf8");
  await writeFile(join(DIST, "llms.txt"), buildLlmsTxt(written), "utf8");
  await writeFile(join(DIST, "404.html"), buildNotFound(shell), "utf8");

  // A bare `/` has no language of its own, so it cannot be a real page. It ships
  // as a tiny redirect whose only job is to pick one and get out of the way,
  // with a canonical pointing at the default so it never competes in the index.
  await writeFile(join(DIST, "index.html"), buildRootRedirect(shell), "utf8");

  console.log(`\nWrote ${written.length} indexable pages + sitemap.xml, robots.txt, llms.txt`);
}

/**
 * Served by nginx with a real 404 status for any URL that has no page.
 *
 * The alternative -- falling back to index.html with a 200 -- is a soft 404:
 * every mistyped URL becomes an indexable duplicate of the home page. This ships
 * the SPA so the visitor still gets the styled NotFound screen, but the status
 * line tells crawlers the truth, and the noindex means the shell itself never
 * enters the index.
 */
function buildNotFound(shell: string): string {
  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, "");

  return html.replace(
    "</head>",
    ["  <title>Page not found | Beyou Docs</title>", '  <meta name="robots" content="noindex, follow" />', "</head>"].join(
      "\n",
    ),
  );
}

function buildRootRedirect(shell: string): string {
  const defaultUrl = absoluteUrl(SITE_URL, localizedPath(DEFAULT_LOCALE, "/"));

  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, "");
  html = html.replace(
    "</head>",
    [
      `  <title>${escapeHtml(SITE_NAME)}</title>`,
      `  <link rel="canonical" href="${defaultUrl}" />`,
      // The app redirects on boot using the visitor's own language preference;
      // this only covers clients that never run it.
      `  <meta http-equiv="refresh" content="0; url=${absoluteUrl(SITE_URL, localizedPath(DEFAULT_LOCALE, "/"))}" />`,
      ...SUPPORTED_LOCALES.map(
        (locale) =>
          `  <link rel="alternate" hreflang="${locale}" href="${absoluteUrl(SITE_URL, localizedPath(locale, "/"))}" />`,
      ),
      `  <link rel="alternate" hreflang="x-default" href="${defaultUrl}" />`,
      "</head>",
    ].join("\n"),
  );

  return html;
}

await main();
