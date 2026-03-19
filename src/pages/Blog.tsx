import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MarkdownContent } from "@/components/markdown/MarkdownContent";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseTags } from "@/lib/projectApi";
import {
  fetchBlogTopics,
  fetchBlogTopicDetail,
  estimateReadingTime,
  formatRelativeDate,
  type BlogTopicListItem,
  type BlogTopicDetail,
} from "@/lib/blogApi";

/* ── constants ───────────────────────────────────────────── */

type CategoryFilter = "all" | "technical" | "planning";

const CATEGORY_STYLE: Record<string, { text: string; bg: string }> = {
  TECHNICAL: { text: "text-purple-400", bg: "bg-purple-500/20" },
  PLANNING: { text: "text-blue-400", bg: "bg-blue-500/20" },
};

function categoryStyle(category: string) {
  return CATEGORY_STYLE[category.toUpperCase()] ?? CATEGORY_STYLE.TECHNICAL;
}

/* ── stagger variants ────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

/* ── component ───────────────────────────────────────────── */

export default function Blog() {
  const { t, i18n } = useTranslation();
  const locale = useMemo(
    () => (i18n.language?.toLowerCase().startsWith("pt") ? "pt" : "en"),
    [i18n.language],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const postKey = searchParams.get("post");

  /* ── topics state ──────────────────────────────────────── */
  const [topics, setTopics] = useState<BlogTopicListItem[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  /* ── detail state ──────────────────────────────────────── */
  const [detail, setDetail] = useState<BlogTopicDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  /* ── filter state ──────────────────────────────────────── */
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const topicsLoadId = useRef(0);
  const detailLoadId = useRef(0);

  /* ── fetch topics ──────────────────────────────────────── */
  useEffect(() => {
    const loadId = ++topicsLoadId.current;
    setTopicsLoading(true);
    setTopicsError(null);

    fetchBlogTopics(locale)
      .then((data) => {
        if (topicsLoadId.current !== loadId) return;
        setTopics(data);
      })
      .catch((error) => {
        if (topicsLoadId.current !== loadId) return;
        setTopicsError(
          error instanceof Error ? error.message : t("blog.errors.loadTopics"),
        );
      })
      .finally(() => {
        if (topicsLoadId.current === loadId) setTopicsLoading(false);
      });
  }, [locale, t]);

  /* ── fetch detail when post param changes ──────────────── */
  useEffect(() => {
    if (!postKey) {
      setDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    const loadId = ++detailLoadId.current;
    setDetailLoading(true);
    setDetailError(null);

    fetchBlogTopicDetail(postKey, locale)
      .then((data) => {
        if (detailLoadId.current !== loadId) return;
        setDetail(data);
      })
      .catch((error) => {
        if (detailLoadId.current !== loadId) return;
        setDetail(null);
        setDetailError(
          error instanceof Error ? error.message : t("blog.errors.loadDetail"),
        );
      })
      .finally(() => {
        if (detailLoadId.current === loadId) setDetailLoading(false);
      });
  }, [postKey, locale, t]);

  /* ── derived: filtered topics ──────────────────────────── */
  const filteredTopics = useMemo(() => {
    let result = topics;

    if (categoryFilter !== "all") {
      result = result.filter(
        (tp) => tp.category.toLowerCase() === categoryFilter,
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((tp) => {
        const title = tp.title.toLowerCase();
        const summary = (tp.summary ?? "").toLowerCase();
        const tags = parseTags(tp.tags ?? "").join(" ").toLowerCase();
        return title.includes(query) || summary.includes(query) || tags.includes(query);
      });
    }

    return result;
  }, [topics, categoryFilter, searchQuery]);

  const featuredPost = useMemo(
    () => filteredTopics.find((tp) => tp.featured) ?? null,
    [filteredTopics],
  );

  const gridPosts = useMemo(
    () =>
      featuredPost
        ? filteredTopics.filter((tp) => tp.key !== featuredPost.key)
        : filteredTopics,
    [filteredTopics, featuredPost],
  );

  /* ── callbacks ─────────────────────────────────────────── */
  const openPost = useCallback(
    (key: string) => {
      const next = new URLSearchParams();
      next.set("post", key);
      setSearchParams(next, { replace: false });
    },
    [setSearchParams],
  );

  const goBack = useCallback(() => {
    setSearchParams({}, { replace: false });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setCategoryFilter("all");
    setSearchQuery("");
  }, []);

  /* ── render ────────────────────────────────────────────── */
  return (
    <MainLayout>
      <AnimatePresence mode="wait">
        {postKey ? (
          /* ═══════════════ READING VIEW ═══════════════ */
          <motion.div
            key="reading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-[calc(100vh-64px)] overflow-auto"
          >
            <div className="max-w-[680px] mx-auto px-4 md:px-6 py-10 md:py-14">
              {/* back button */}
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("blog.reading.back")}
              </button>

              {detailLoading && (
                <div className="glass-panel rounded-xl p-6 text-sm text-muted-foreground">
                  {t("blog.reading.loading")}
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="glass-panel rounded-xl p-6 text-sm text-red-200">
                  {detailError}
                </div>
              )}

              {!detailLoading && !detailError && detail && (
                <>
                  {/* post header */}
                  <div className="mb-8">
                    {/* category badge */}
                    <span
                      className={cn(
                        "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide mb-3",
                        categoryStyle(detail.category).bg,
                        categoryStyle(detail.category).text,
                      )}
                    >
                      {detail.category}
                    </span>

                    {/* tags */}
                    {parseTags(detail.tags ?? "").length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {parseTags(detail.tags ?? "").map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                      {detail.title}
                    </h1>

                    {/* author line */}
                    <div className="flex items-center gap-3 mt-5">
                      {detail.author && (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${detail.coverColor ?? "hsl(var(--primary))"}, hsl(var(--primary)))`,
                          }}
                        >
                          {detail.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col text-sm">
                        {detail.author && (
                          <span className="text-foreground font-medium">
                            {detail.author}
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {detail.publishedAt
                            ? formatRelativeDate(detail.publishedAt, locale)
                            : detail.updatedAt
                              ? formatRelativeDate(detail.updatedAt, locale)
                              : ""}
                          {detail.docMarkdown && (
                            <>
                              {" "}
                              &middot;{" "}
                              {t("blog.landing.minRead", {
                                count: estimateReadingTime(detail.docMarkdown),
                              })}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* content */}
                  <div className="glass-panel rounded-2xl p-6 md:p-8">
                    {detail.docMarkdown?.trim() ? (
                      <MarkdownContent content={detail.docMarkdown} />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {t("blog.reading.noContent")}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          /* ═══════════════ LANDING VIEW ═══════════════ */
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-[calc(100vh-64px)] overflow-auto"
          >
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
              {/* ── header area ──────────────────────── */}
              <div className="mb-8">
                <div className="flex items-baseline gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {t("blog.landing.title")}
                  </h1>
                  {!topicsLoading && (
                    <span className="text-sm text-muted-foreground">
                      {t("blog.landing.postCount", { count: filteredTopics.length })}
                    </span>
                  )}
                </div>

                {/* filter bar */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  {/* category pills */}
                  <div className="flex gap-2">
                    {(["all", "technical", "planning"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          categoryFilter === cat
                            ? "bg-primary/20 border-primary/50 text-primary"
                            : "bg-white/5 border-glass-border/30 text-muted-foreground hover:border-primary/30",
                        )}
                      >
                        {t(`blog.filters.${cat}`)}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 max-w-xs">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("blog.landing.search")}
                      className="bg-background/60"
                    />
                  </div>
                </div>
              </div>

              {/* ── loading ──────────────────────────── */}
              {topicsLoading && (
                <div className="text-sm text-muted-foreground py-12 text-center">
                  {t("common.loading")}
                </div>
              )}

              {/* ── error ────────────────────────────── */}
              {!topicsLoading && topicsError && (
                <div className="text-sm text-red-200 py-12 text-center">
                  {topicsError}
                </div>
              )}

              {/* ── empty: zero posts at all ─────────── */}
              {!topicsLoading && !topicsError && topics.length === 0 && (
                <div className="text-sm text-muted-foreground py-20 text-center">
                  {t("blog.landing.noPosts")}
                </div>
              )}

              {/* ── empty: filter no matches ─────────── */}
              {!topicsLoading &&
                !topicsError &&
                topics.length > 0 &&
                filteredTopics.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-20">
                    <p className="text-sm text-muted-foreground">
                      {t("blog.landing.noMatches")}
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-sm text-primary hover:underline"
                    >
                      {t("blog.landing.clearFilters")}
                    </button>
                  </div>
                )}

              {/* ── content ──────────────────────────── */}
              {!topicsLoading && !topicsError && filteredTopics.length > 0 && (
                <>
                  {/* ── featured hero ────────────────── */}
                  {featuredPost && (
                    <motion.button
                      type="button"
                      onClick={() => openPost(featuredPost.key)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="w-full text-left rounded-2xl border border-glass-border/30 overflow-hidden mb-8 group transition-colors hover:border-primary/40"
                      style={{
                        background: `linear-gradient(135deg, ${featuredPost.coverColor ?? "hsl(var(--primary))"}15, transparent 60%)`,
                      }}
                    >
                      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
                        {/* emoji */}
                        {featuredPost.coverEmoji && (
                          <div className="text-5xl md:text-6xl shrink-0 group-hover:scale-105 transition-transform">
                            {featuredPost.coverEmoji}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                                categoryStyle(featuredPost.category).bg,
                                categoryStyle(featuredPost.category).text,
                              )}
                            >
                              {featuredPost.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400">
                              {t("blog.landing.featured")}
                            </span>
                          </div>
                          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {featuredPost.title}
                          </h2>
                          {featuredPost.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {featuredPost.summary}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            {parseTags(featuredPost.tags ?? "")
                              .slice(0, 4)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary"
                                >
                                  {tag}
                                </span>
                              ))}
                            {featuredPost.author && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {featuredPost.author}
                              </span>
                            )}
                            {(featuredPost.publishedAt ?? featuredPost.updatedAt) && (
                              <span className="text-xs text-muted-foreground/60">
                                {formatRelativeDate(
                                  (featuredPost.publishedAt ?? featuredPost.updatedAt)!,
                                  locale,
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  )}

                  {/* ── recent posts grid ────────────── */}
                  {gridPosts.length > 0 && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {gridPosts.map((post) => {
                        const tags = parseTags(post.tags ?? "");
                        const cs = categoryStyle(post.category);
                        return (
                          <motion.button
                            key={post.key}
                            type="button"
                            variants={cardVariants}
                            onClick={() => openPost(post.key)}
                            className="text-left glass-panel rounded-xl border border-glass-border/30 p-5 flex flex-col gap-3 transition-colors hover:border-primary/40 group"
                          >
                            {/* top: emoji + category */}
                            <div className="flex items-center gap-2">
                              {post.coverEmoji && (
                                <span className="text-2xl">{post.coverEmoji}</span>
                              )}
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                                  cs.bg,
                                  cs.text,
                                )}
                              >
                                {post.category}
                              </span>
                            </div>

                            {/* title */}
                            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {post.title}
                            </h3>

                            {/* summary */}
                            {post.summary && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {post.summary}
                              </p>
                            )}

                            {/* tags */}
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-auto">
                                {tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {tags.length > 3 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground">
                                    +{tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* date */}
                            {(post.publishedAt ?? post.updatedAt) && (
                              <span className="text-[10px] text-muted-foreground/60">
                                {formatRelativeDate(
                                  (post.publishedAt ?? post.updatedAt)!,
                                  locale,
                                )}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
