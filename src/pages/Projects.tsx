import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FolderKanban,
  GitBranch,
  GitCommit,
  RefreshCcw,
  Search,
  Tag,
  ExternalLink,
  Eye,
  FileText,
  GitFork,
  Layers,
  Code,
  Link,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DesignMarkdown } from "@/components/design/DesignMarkdown";
import { MermaidBlock } from "@/components/design/MermaidBlock";
import { useTranslation } from "react-i18next";
import { fetchProjectTopics, fetchProjectTopicDetail, parseTags, type ProjectTopicListItem, type ProjectTopicDetail } from "@/lib/projectApi";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  draft: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

type StatusFilter = "all" | "active" | "archived" | "draft";
type SortOption = "title" | "updated" | "order";

export default function Projects() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [topics, setTopics] = useState<ProjectTopicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("order");
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectTopicDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const loadIdRef = useRef(0);

  useEffect(() => {
    return () => {
      loadIdRef.current += 1;
    };
  }, []);

  const loadTopics = useCallback(async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    setLoading(true);
    setError(null);
    setTopics([]);
    try {
      const data = await fetchProjectTopics();
      if (loadIdRef.current !== loadId) return;
      setTopics(data);
    } catch (loadError) {
      if (loadIdRef.current !== loadId) return;
      setError(loadError instanceof Error ? loadError.message : t("projects.errors.load"));
    } finally {
      if (loadIdRef.current === loadId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  const loadDetail = useCallback(async (key: string) => {
    setDetailLoading(true);
    try {
      const data = await fetchProjectTopicDetail(key);
      console.log("DATA => ", data);
      setDetail(data);
    } catch (err) {
      console.error("Failed to load project detail", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTopicKey) {
      void loadDetail(selectedTopicKey);
    }
  }, [selectedTopicKey, loadDetail]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((topic) => {
      const tags = parseTags(topic.tags);
      tags.forEach(tag => set.add(tag));
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [topics]);

  const filteredTopics = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    const filtered = topics.filter((topic) => {
      if (statusFilter !== "all" && topic.status.toLowerCase() !== statusFilter) return false;
      if (!trimmed) return true;
      const searchFields = [
        topic.title,
        topic.summary,
        ...parseTags(topic.tags),
      ];
      return searchFields.some((field) => field.toLowerCase().includes(trimmed));
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "updated") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      // order
      return a.orderIndex - b.orderIndex;
    });

    return sorted;
  }, [topics, searchQuery, statusFilter, sortBy]);

  const totalTopics = topics.length;
  const activeTopics = topics.filter(t => t.status === "ACTIVE").length;

  return (
    <MainLayout>
      <div className="p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("projects.title")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("projects.subtitle")}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={loadTopics} aria-label={t("common.refresh")}>
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Search + Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("projects.search")}
                  className="pl-10 bg-white/5 border-glass-border/30"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {t("projects.count", { total: totalTopics, active: activeTopics })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-36 bg-white/5 border-glass-border/30">
                  <SelectValue placeholder={t("projects.filters.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("projects.filters.allStatuses")}</SelectItem>
                  <SelectItem value="active">{t("projects.filters.active")}</SelectItem>
                  <SelectItem value="archived">{t("projects.filters.archived")}</SelectItem>
                  <SelectItem value="draft">{t("projects.filters.draft")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-44 bg-white/5 border-glass-border/30">
                  <SelectValue placeholder={t("projects.filters.sortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">{t("projects.filters.order")}</SelectItem>
                  <SelectItem value="title">{t("projects.filters.name")}</SelectItem>
                  <SelectItem value="updated">{t("projects.filters.recentlyUpdated")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="glass-panel rounded-xl p-4 text-sm text-red-200 mb-6">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-sm text-muted-foreground mb-6">
              {topics.length
                ? t("projects.loading.more", { count: topics.length })
                : t("projects.loading.initial")}
            </div>
          )}

          {/* Projects Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTopics.map((topic, index) => (
              <ProjectTopicCard
                key={topic.key}
                topic={topic}
                index={index}
                onViewDetails={() => setSelectedTopicKey(topic.key)}
              />
            ))}
          </div>

          {filteredTopics.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FolderKanban className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("projects.empty.title")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("projects.empty.subtitle")}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedTopicKey} onOpenChange={(open) => !open && setSelectedTopicKey(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{detail.title}</DialogTitle>
                <DialogDescription>
                  Last updated: {formatDate(detail.updatedAt, t)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Links */}
                <div className="flex flex-wrap gap-4">
                  {detail.repositoryUrl && (
                    <a
                      href={detail.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
                    >
                      <Code className="w-4 h-4" />
                      {t("projects.detail.repository")}
                    </a>
                  )}
                  {detail.designTopicKey && (
                    <a
                      href={`/design/${detail.designTopicKey}`}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
                    >
                      <Layers className="w-4 h-4" />
                      {t("projects.detail.design")}
                    </a>
                  )}
                  {detail.architectureTopicKey && (
                    <a
                      href={`/architecture/${detail.architectureTopicKey}`}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
                    >
                      <GitFork className="w-4 h-4" />
                      {t("projects.detail.architecture")}
                    </a>
                  )}
                </div>

                {/* Mermaid diagram */}
                {detail.diagramMermaid && (
                  <div className="rounded-lg border border-glass-border/30 p-4">
                    <h3 className="text-lg font-semibold mb-2">{t("projects.detail.diagram")}</h3>
                    <MermaidBlock code={detail.diagramMermaid} />
                  </div>
                )}

                {/* Markdown documentation */}
                <div className="rounded-lg border border-glass-border/30 p-4">
                  <h3 className="text-lg font-semibold mb-2">{t("projects.detail.documentation")}</h3>
                  <DesignMarkdown content={detail.docMarkdown} />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {parseTags(detail.tags).map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-white/10 text-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {t("projects.detail.notFound")}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

interface ProjectTopicCardProps {
  topic: ProjectTopicListItem;
  index: number;
  onViewDetails: () => void;
}

function ProjectTopicCard({ topic, index, onViewDetails }: ProjectTopicCardProps) {
  const { t } = useTranslation();
  const status = topic.status.toLowerCase();
  const updatedLabel = formatDate(topic.updatedAt, t);
  const tags = parseTags(topic.tags).slice(0, 6);

  return (
    <motion.div
      key={topic.key}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      className="glass-panel rounded-xl p-6 cursor-pointer gradient-border"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-foreground">{topic.title}</h3>
            <Badge variant="outline" className={statusColors[status]}>
              {t(`projects.status.${status}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {topic.summary || t("projects.noDescription")}
          </p>
          <p className="text-xs text-muted-foreground">
            {topic.key}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onViewDetails}
          aria-label={t("projects.viewDetails")}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-white/10 text-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>{t("projects.order", { order: topic.orderIndex })}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag className="w-4 h-4" />
          <span>{tags.length} tags</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-glass-border/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t("projects.updated", { date: updatedLabel })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
          className="text-xs"
        >
          {t("projects.viewDetails")}
        </Button>
      </div>
    </motion.div>
  );
}

function formatDate(value: string, t: (key: string) => string): string {
  if (!value) return t("common.unknown");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("common.unknown");
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
