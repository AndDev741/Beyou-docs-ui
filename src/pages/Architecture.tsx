import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MermaidBlock } from "@/components/markdown/MermaidBlock";
import { MarkdownContent } from "@/components/markdown/MarkdownContent";
import { cn } from "@/lib/utils";
import {
  fetchArchitectureTopicDetail,
  fetchArchitectureTopics,
  estimateReadingTime,
  formatRelativeDate,
  type ArchitectureTopicDetail,
  type ArchitectureTopicListItem,
} from "@/lib/architectureApi";
import { parseTags } from "@/lib/projectApi";

/* ── helpers ─────────────────────────────────────────────── */

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-emerald-400",
  DRAFT: "bg-amber-400",
  ARCHIVED: "bg-zinc-400",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "border-emerald-500/40 text-emerald-400",
  DRAFT: "border-amber-500/40 text-amber-400",
  ARCHIVED: "border-zinc-500/40 text-zinc-400",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface TocEntry {
  level: number;
  text: string;
  id: string;
}

function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (match) {
      entries.push({
        level: match[1].length,
        text: match[2],
        id: slugify(match[2]),
      });
    }
  }
  return entries;
}

/* ── line widths per heading level ───────────────────────── */
const LINE_W: Record<number, string> = {
  1: "w-5",
  2: "w-3.5",
  3: "w-2",
};

/* ── Notion-style ToC rail ───────────────────────────────── */

function TocRail({
  toc,
  scrollRoot,
  onNavigate,
}: {
  toc: TocEntry[];
  scrollRoot: React.RefObject<HTMLDivElement>;
  onNavigate: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* keep the popover visible while the cursor is anywhere inside */
  const show = useCallback(() => setHovered(true), []);
  const hide = useCallback(() => setHovered(false), []);

  /* track active heading via scroll on the detail panel */
  useEffect(() => {
    if (!toc.length || !scrollRoot.current) return;

    const root = scrollRoot.current;
    const headingIds = toc.map((e) => e.id);
    let lastId = "";
    let rafId = 0;

    const computeActive = () => {
      const scrollTop = root.scrollTop;
      const offset = root.clientHeight * 0.15;
      let current = headingIds[0];

      for (const id of headingIds) {
        const el = root.querySelector(`#${CSS.escape(id)}`);
        if (!el) continue;
        const top = (el as HTMLElement).offsetTop - root.offsetTop;
        if (top <= scrollTop + offset) {
          current = id;
        } else {
          break;
        }
      }

      if (current && current !== lastId) {
        lastId = current;
        setActiveHeadingId(current);
      }
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(computeActive);
    };

    const timeout = setTimeout(() => {
      computeActive();
      root.addEventListener("scroll", handleScroll, { passive: true });
    }, 300);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafId);
      root.removeEventListener("scroll", handleScroll);
    };
  }, [toc, scrollRoot]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 hidden md:flex items-center"
    >
      {/* ── expanded popover (on hover) ── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mr-1 max-h-[70vh] overflow-y-auto rounded-xl border border-glass-border/30 bg-background/90 backdrop-blur-xl shadow-xl py-2 px-1"
            style={{ minWidth: 200, maxWidth: 300 }}
          >
            {toc.map((entry) => {
              const isActive = activeHeadingId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onNavigate(entry.id)}
                  className={cn(
                    "flex items-center gap-2 w-full text-left rounded-lg px-3 py-1.5 text-[13px] leading-snug transition-colors duration-100",
                    entry.level === 2 && "pl-6",
                    entry.level === 3 && "pl-9",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <span
                    className={cn(
                      "w-0.5 self-stretch rounded-full shrink-0 transition-colors",
                      isActive ? "bg-primary" : "bg-transparent",
                    )}
                  />
                  <span className={cn(
                    "line-clamp-2",
                    entry.level === 1 && "font-medium",
                    entry.level === 3 && "text-xs",
                  )}>
                    {entry.text}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── line rail (always visible) ── */}
      <div className="flex flex-col items-end gap-[5px] py-2 px-2.5 cursor-pointer">
        {toc.map((entry) => {
          const isActive = activeHeadingId === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onNavigate(entry.id)}
              className={cn(
                "h-[3px] rounded-full transition-all duration-200",
                LINE_W[entry.level] ?? "w-2",
                isActive
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/60",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────── */

export default function Architecture() {
  const { t, i18n } = useTranslation();
  const locale = useMemo(
    () => (i18n.language?.toLowerCase().startsWith("pt") ? "pt" : "en"),
    [i18n.language],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialTopicParam] = useState(() => searchParams.get("topic"));

  const [topics, setTopics] = useState<ArchitectureTopicListItem[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(initialTopicParam);
  const [detail, setDetail] = useState<ArchitectureTopicDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const topicsLoadId = useRef(0);
  const detailLoadId = useRef(0);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Sync URL param whenever selected topic changes
  useEffect(() => {
    const currentParam = searchParams.get("topic");
    if (selectedTopicKey !== currentParam) {
      const next = new URLSearchParams();
      if (selectedTopicKey) next.set("topic", selectedTopicKey);
      setSearchParams(next, { replace: true });
    }
  }, [selectedTopicKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadId = topicsLoadId.current + 1;
    topicsLoadId.current = loadId;
    setTopicsLoading(true);
    setTopicsError(null);

    fetchArchitectureTopics(locale)
      .then((data) => {
        if (topicsLoadId.current !== loadId) return;
        setTopics(data);

        // Only set a default topic on first load — never overwrite user selection
        setSelectedTopicKey((current) => {
          if (current && data.some((topic) => topic.key === current)) return current;
          const preferred =
            initialTopicParam && data.some((topic) => topic.key === initialTopicParam)
              ? initialTopicParam
              : data[0]?.key ?? null;
          return preferred;
        });
      })
      .catch((error) => {
        if (topicsLoadId.current !== loadId) return;
        setTopicsError(error instanceof Error ? error.message : t("architecture.errors.loadTopics"));
      })
      .finally(() => {
        if (topicsLoadId.current === loadId) {
          setTopicsLoading(false);
        }
      });
  }, [initialTopicParam, locale, t]);

  useEffect(() => {
    if (!selectedTopicKey) {
      setDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    const loadId = detailLoadId.current + 1;
    detailLoadId.current = loadId;
    // Keep previous detail visible while loading (no setDetail(null))
    setDetailLoading(true);
    setDetailError(null);

    fetchArchitectureTopicDetail(selectedTopicKey, locale)
      .then((data) => {
        if (detailLoadId.current !== loadId) return;
        setDetail(data);
      })
      .catch((error) => {
        if (detailLoadId.current !== loadId) return;
        setDetail(null);
        setDetailError(error instanceof Error ? error.message : t("architecture.errors.loadFile"));
      })
      .finally(() => {
        if (detailLoadId.current === loadId) {
          setDetailLoading(false);
        }
      });
  }, [selectedTopicKey, locale, t]);

  /* ── derived ──────────────────────────────────────────── */

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    topics.forEach((t) => parseTags(t.tags ?? "").forEach((tag) => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [topics]);

  const filteredTopics = useMemo(() => {
    let result = topics;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((topic) => {
        const title = topic.title.toLowerCase();
        const summary = topic.summary?.toLowerCase() ?? "";
        const tags = parseTags(topic.tags ?? "").join(" ").toLowerCase();
        return title.includes(query) || summary.includes(query) || tags.includes(query);
      });
    }

    if (selectedTags.size > 0) {
      result = result.filter((topic) => {
        const tags = parseTags(topic.tags ?? "");
        return [...selectedTags].every((st) => tags.includes(st));
      });
    }

    return result;
  }, [topics, searchQuery, selectedTags]);

  const toc = useMemo(() => {
    if (!detail?.docMarkdown) return [];
    return extractToc(detail.docMarkdown);
  }, [detail?.docMarkdown]);


  /* ── callbacks ────────────────────────────────────────── */

  const handleSelectTopic = useCallback(
    (key: string) => {
      setSelectedTopicKey(key);
      detailPanelRef.current?.scrollTo({ top: 0 });
    },
    [],
  );

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags(new Set());
    setSearchQuery("");
  }, []);

  const scrollToHeading = useCallback((id: string) => {
    const el = detailPanelRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeadingId(id);
    }
  }, []);

  /* ── render ───────────────────────────────────────────── */

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:h-[calc(100vh-64px)]">
        {/* ── sidebar ───────────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-80 border-b md:border-b-0 md:border-r border-glass-border/30 glass-panel flex flex-col max-h-[60vh] md:max-h-none"
        >
          <div className="p-6 border-b border-glass-border/30">
            <h1 className="text-lg font-semibold text-foreground">{t("architecture.sidebar.title")}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t("architecture.sidebar.topicCount", { count: topics.length })}
            </p>
            <div className="mt-4">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("architecture.sidebar.search")}
                className="bg-background/60"
              />
            </div>

            {/* tag filter chips */}
            {allTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 max-h-24 overflow-auto">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs border transition-colors",
                      selectedTags.has(tag)
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-white/5 border-glass-border/30 text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.size > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-2 py-0.5 rounded-full text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    {t("architecture.sidebar.clearFilters")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* topic list */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {topicsLoading && (
              <div className="text-sm text-muted-foreground">
                {t("architecture.sidebar.loadingTopics")}
              </div>
            )}
            {!topicsLoading && topicsError && (
              <div className="text-sm text-red-200">{topicsError}</div>
            )}
            {!topicsLoading && !topicsError && filteredTopics.length === 0 && (
              <div className="text-sm text-muted-foreground">
                {t("architecture.sidebar.noTopics")}
              </div>
            )}
            {!topicsLoading && !topicsError && filteredTopics.map((topic) => {
              const tags = parseTags(topic.tags ?? "");
              const status = topic.status ?? "ACTIVE";
              return (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => handleSelectTopic(topic.key)}
                  className={cn(
                    "w-full text-left rounded-xl p-4 border transition",
                    selectedTopicKey === topic.key
                      ? "border-primary/50 bg-primary/10"
                      : "border-glass-border/30 bg-white/5 hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[status] ?? STATUS_DOT.ACTIVE)} />
                    <span className="text-sm font-semibold text-foreground truncate">{topic.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {topic.summary || t("architecture.topic.noDescription")}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-muted-foreground">
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
                  {topic.updatedAt && (
                    <div className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {formatRelativeDate(topic.updatedAt, locale)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.aside>

        {/* ── detail panel ──────────────────────────────── */}
        <div ref={detailPanelRef} className="flex-1 overflow-auto relative">
          {!selectedTopicKey && (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {t("architecture.empty")}
            </div>
          )}

          {selectedTopicKey && (
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-12">
              {/* Show loading only on first load (no detail yet) */}
              {detailLoading && !detail && (
                <div className="glass-panel rounded-xl p-6 text-sm text-muted-foreground">
                  {t("common.loading")}
                </div>
              )}
              {!detailLoading && detailError && (
                <div className="glass-panel rounded-xl p-6 text-sm text-red-200">
                  {detailError}
                </div>
              )}
              {detail && (
                <div className={cn(
                  "transition-opacity duration-300",
                  detailLoading ? "opacity-40 pointer-events-none" : "opacity-100",
                )}>
                  {/* rich header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-semibold text-foreground">{detail.title}</h2>
                      {detail.status && (
                        <Badge
                          variant="outline"
                          className={cn("text-xs", STATUS_BADGE[detail.status] ?? STATUS_BADGE.ACTIVE)}
                        >
                          {t(`architecture.status.${detail.status.toLowerCase()}`)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {detail.updatedAt && (
                        <span>{t("architecture.topic.updated", { date: formatRelativeDate(detail.updatedAt, locale) })}</span>
                      )}
                      {detail.docMarkdown && (
                        <>
                          <span className="text-muted-foreground/40">|</span>
                          <span>{t("architecture.topic.readingTime", { count: estimateReadingTime(detail.docMarkdown) })}</span>
                        </>
                      )}
                      {detail.projectKey && (
                        <>
                          <span className="text-muted-foreground/40">|</span>
                          <a
                            href={`/projects?topic=${detail.projectKey}`}
                            className="text-primary hover:underline"
                          >
                            {t("architecture.topic.viewProject")}
                          </a>
                        </>
                      )}
                    </div>
                    {/* detail tags */}
                    {parseTags(detail.tags ?? "").length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {parseTags(detail.tags ?? "").map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-white/10 text-foreground cursor-pointer hover:bg-white/20 transition-colors"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* mermaid diagram */}
                  <div className="glass-panel rounded-2xl p-4 md:p-6 mb-8">
                    {detail.diagramMermaid?.trim() ? (
                      <MermaidBlock code={detail.diagramMermaid} className="w-full" />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {t("architecture.mermaid.empty")}
                      </div>
                    )}
                  </div>

                  {/* documentation */}
                  <div className="glass-panel rounded-2xl p-6 md:p-8">
                    {detail.docMarkdown?.trim() ? (
                      <MarkdownContent content={detail.docMarkdown} />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {t("architecture.docs.noContent")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Notion-style ToC rail (right edge) ── */}
          {toc.length > 2 && (
            <TocRail
              toc={toc}
              scrollRoot={detailPanelRef}
              onNavigate={scrollToHeading}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
