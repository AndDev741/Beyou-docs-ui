import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { DesignMarkdown } from "@/components/design/DesignMarkdown";
import { cn } from "@/lib/utils";
import {
  fetchDesignTopicDetail,
  fetchDesignTopics,
  type DesignTopicDetail,
  type DesignTopicListItem,
} from "@/lib/designApi";

export default function Design() {
  const { t, i18n } = useTranslation();
  const locale = useMemo(
    () => (i18n.language?.toLowerCase().startsWith("pt") ? "pt" : "en"),
    [i18n.language],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialTopicParam] = useState(() => searchParams.get("topic"));

  const [topics, setTopics] = useState<DesignTopicListItem[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(initialTopicParam);
  const [detail, setDetail] = useState<DesignTopicDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const topicsLoadId = useRef(0);
  const detailLoadId = useRef(0);

  const syncTopicParam = useCallback(
    (key: string | null) => {
      const next = new URLSearchParams();
      if (key) {
        next.set("topic", key);
      }
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const loadId = topicsLoadId.current + 1;
    topicsLoadId.current = loadId;
    setTopicsLoading(true);
    setTopicsError(null);

    fetchDesignTopics(locale)
      .then((data) => {
        if (topicsLoadId.current !== loadId) return;
        setTopics(data);

        const preferred =
          initialTopicParam && data.some((topic) => topic.key === initialTopicParam)
            ? initialTopicParam
            : data[0]?.key ?? null;

        setSelectedTopicKey(preferred);
        syncTopicParam(preferred);
      })
      .catch((error) => {
        if (topicsLoadId.current !== loadId) return;
        setTopicsError(error instanceof Error ? error.message : t("design.errors.loadTopics"));
      })
      .finally(() => {
        if (topicsLoadId.current === loadId) {
          setTopicsLoading(false);
        }
      });
  }, [initialTopicParam, locale, syncTopicParam, t]);

  useEffect(() => {
    if (!selectedTopicKey) {
      setDetail(null);
      return;
    }

    const loadId = detailLoadId.current + 1;
    detailLoadId.current = loadId;
    setDetailLoading(true);
    setDetailError(null);

    fetchDesignTopicDetail(selectedTopicKey, locale)
      .then((data) => {
        if (detailLoadId.current !== loadId) return;
        setDetail(data);
      })
      .catch((error) => {
        if (detailLoadId.current !== loadId) return;
        setDetailError(error instanceof Error ? error.message : t("design.errors.loadDetail"));
      })
      .finally(() => {
        if (detailLoadId.current === loadId) {
          setDetailLoading(false);
        }
      });
  }, [locale, selectedTopicKey, t]);

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return topics;
    return topics.filter((topic) => {
      return (
        topic.title.toLowerCase().includes(query) ||
        (topic.summary ?? "").toLowerCase().includes(query) ||
        topic.key.toLowerCase().includes(query)
      );
    });
  }, [topics, searchQuery]);

  const handleSelectTopic = useCallback(
    (key: string) => {
      setSelectedTopicKey(key);
      syncTopicParam(key);
    },
    [syncTopicParam],
  );

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:h-[calc(100vh-64px)]">
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-80 border-b md:border-b-0 md:border-r border-glass-border/30 glass-panel flex flex-col max-h-[50vh] md:max-h-none"
        >
          <div className="p-6 border-b border-glass-border/30">
            <h1 className="text-lg font-semibold text-foreground">{t("design.sidebar.title")}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t("design.sidebar.topicCount", { count: topics.length })}
            </p>
            <div className="mt-4">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("design.sidebar.search")}
                className="bg-background/60"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {topicsLoading && (
              <div className="text-sm text-muted-foreground">
                {t("design.sidebar.loadingTopics")}
              </div>
            )}
            {!topicsLoading && topicsError && (
              <div className="text-sm text-red-200">{topicsError}</div>
            )}
            {!topicsLoading && !topicsError && filteredTopics.length === 0 && (
              <div className="text-sm text-muted-foreground">
                {t("design.sidebar.noTopics")}
              </div>
            )}
            {!topicsLoading && !topicsError && filteredTopics.map((topic) => (
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
                <div className="text-sm font-semibold text-foreground">{topic.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {topic.summary || t("design.topic.noDescription")}
                </div>
              </button>
            ))}
          </div>
        </motion.aside>

        <div className="flex-1 overflow-auto">
          {!selectedTopicKey && (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {t("design.empty")}
            </div>
          )}

          {selectedTopicKey && (
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-12">
              {detailLoading && (
                <div className="glass-panel rounded-xl p-6 text-sm text-muted-foreground">
                  {t("common.loading")}
                </div>
              )}
              {!detailLoading && detailError && (
                <div className="glass-panel rounded-xl p-6 text-sm text-red-200">
                  {detailError}
                </div>
              )}
              {!detailLoading && !detailError && detail && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-foreground">{detail.title}</h2>
                    {detail.updatedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("design.topic.updated", { date: detail.updatedAt })}
                      </p>
                    )}
                  </div>

                  <div className="glass-panel rounded-2xl p-6 md:p-8">
                    {detail.docMarkdown?.trim() ? (
                      <DesignMarkdown content={detail.docMarkdown} />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {t("design.docs.noContent")}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
