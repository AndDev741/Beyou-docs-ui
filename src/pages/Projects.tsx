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
import { resolveProjectOrg, resolveProjectRepos } from "@/data/projectRepos";
import type { ProjectEntry, ProjectInfo } from "@/lib/githubProjects";
import { fetchOrgProjects, fetchProjectsByRepos } from "@/lib/githubProjects";
import { useTranslation } from "react-i18next";

const envProjectRepos = import.meta.env.VITE_PROJECT_REPOS as string | undefined;
const envProjectOrg = import.meta.env.VITE_PROJECTS_ORG as string | undefined;

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  disabled: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

type StatusFilter = "all" | "active" | "archived" | "disabled" | "fork";
type VisibilityFilter = "all" | "public" | "private" | "internal";
type SortOption = "name" | "updated" | "commits" | "branches" | "tags";

export default function Projects() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const repoConfigs = useMemo(() => resolveProjectRepos(envProjectRepos), [envProjectRepos]);
  const orgName = useMemo(() => resolveProjectOrg(envProjectOrg), [envProjectOrg]);
  const loadIdRef = useRef(0);

  useEffect(() => {
    return () => {
      loadIdRef.current += 1;
    };
  }, []);

  const loadProjects = useCallback(async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    setLoading(true);
    setError(null);
    setProjects([]);
    try {
      if (repoConfigs.length) {
        const repoOrder = new Map(
          repoConfigs.map((repo, index) => [repo.id ?? repo.repo, index]),
        );
        const data = await fetchProjectsByRepos(repoConfigs, undefined, {
          concurrency: 4,
          onProgress: (entry) => {
            if (loadIdRef.current !== loadId) return;
            const entryId = entry.repo.id ?? entry.repo.repo;
            setProjects((prev) => {
              const existingIndex = prev.findIndex(
                (item) => (item.repo.id ?? item.repo.repo) === entryId,
              );
              const next = existingIndex >= 0 ? [...prev] : [...prev, entry];
              if (existingIndex >= 0) {
                next[existingIndex] = entry;
              }
              next.sort((a, b) => {
                const aIndex = repoOrder.get(a.repo.id ?? a.repo.repo) ?? 0;
                const bIndex = repoOrder.get(b.repo.id ?? b.repo.repo) ?? 0;
                return aIndex - bIndex;
              });
              return next;
            });
          },
        });
        if (loadIdRef.current !== loadId) return;
        setProjects(data);
      } else {
        const data = await fetchOrgProjects(orgName, undefined, {
          onProgress: (entries) => {
            if (loadIdRef.current !== loadId) return;
            setProjects((prev) => [...prev, ...entries]);
          },
        });
        if (loadIdRef.current !== loadId) return;
        setProjects(data);
      }
    } catch (loadError) {
      if (loadIdRef.current !== loadId) return;
      setError(loadError instanceof Error ? loadError.message : t("projects.errors.load"));
    } finally {
      if (loadIdRef.current === loadId) {
        setLoading(false);
      }
    }
  }, [repoConfigs, orgName]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const projectInfos = useMemo(
    () => projects.map((project) => project.info).filter((info): info is ProjectInfo => Boolean(info)),
    [projects],
  );

  const languageOptions = useMemo(() => {
    const set = new Set<string>();
    projectInfos.forEach((project) => {
      if (project.language) {
        set.add(project.language);
      }
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [projectInfos]);

  const filteredProjects = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    const filtered = projectInfos.filter((project) => {
      const status = project.archived ? "archived" : project.disabled ? "disabled" : "active";
      if (statusFilter === "fork" && !project.fork) return false;
      if (statusFilter !== "all" && statusFilter !== "fork" && status !== statusFilter) return false;
      const visibility = project.visibility?.toLowerCase() ?? "public";
      if (visibilityFilter !== "all" && visibility !== visibilityFilter) return false;
      if (languageFilter !== "all" && project.language !== languageFilter) return false;
      if (!trimmed) return true;
      const searchFields = [
        project.name,
        project.description ?? "",
        project.owner.login,
        project.fullName,
        project.language ?? "",
        ...(project.topics ?? []),
      ];
      return searchFields.some((field) => field.toLowerCase().includes(trimmed));
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "updated") {
        return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
      }
      const getMetric = (project: ProjectInfo) => {
        if (sortBy === "commits") return project.commits ?? -1;
        if (sortBy === "branches") return project.branches ?? -1;
        if (sortBy === "tags") return project.tags ?? -1;
        return -1;
      };
      return getMetric(b) - getMetric(a);
    });

    return sorted;
  }, [
    projectInfos,
    searchQuery,
    statusFilter,
    visibilityFilter,
    languageFilter,
    sortBy,
  ]);

  const repoErrors = projects.filter((project) => project.error);
  const totalProjects = projectInfos.length;
  const activeProjects = projectInfos.filter((project) => !project.archived && !project.disabled).length;

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
            <Button variant="ghost" size="icon" onClick={loadProjects} aria-label={t("common.refresh")}>
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
                {t("projects.count", { total: totalProjects, active: activeProjects })}
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
                  <SelectItem value="disabled">{t("projects.filters.disabled")}</SelectItem>
                  <SelectItem value="fork">{t("projects.filters.forks")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as VisibilityFilter)}>
                <SelectTrigger className="w-36 bg-white/5 border-glass-border/30">
                  <SelectValue placeholder={t("projects.filters.visibility")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("projects.filters.allVisibility")}</SelectItem>
                  <SelectItem value="public">{t("projects.filters.public")}</SelectItem>
                  <SelectItem value="private">{t("projects.filters.private")}</SelectItem>
                  <SelectItem value="internal">{t("projects.filters.internal")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-44 bg-white/5 border-glass-border/30">
                  <SelectValue placeholder={t("projects.filters.language")} />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language === "all" ? t("projects.filters.allLanguages") : language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-44 bg-white/5 border-glass-border/30">
                  <SelectValue placeholder={t("projects.filters.sortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">{t("projects.filters.recentlyUpdated")}</SelectItem>
                  <SelectItem value="name">{t("projects.filters.name")}</SelectItem>
                  <SelectItem value="commits">{t("projects.filters.mostCommits")}</SelectItem>
                  <SelectItem value="branches">{t("projects.filters.mostBranches")}</SelectItem>
                  <SelectItem value="tags">{t("projects.filters.mostTags")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="glass-panel rounded-xl p-4 text-sm text-red-200 mb-6">
              {error}
            </div>
          )}

          {!!repoErrors.length && (
            <div className="glass-panel rounded-xl p-4 space-y-2 mb-6">
              <p className="text-sm font-medium text-foreground">{t("projects.errors.title")}</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                {repoErrors.map((project) => (
                  <div key={project.repo.id ?? project.repo.repo} className="flex items-center justify-between">
                    <span>{project.repo.label ?? `${project.repo.owner}/${project.repo.repo}`}</span>
                    <span>{project.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="text-sm text-muted-foreground mb-6">
              {projects.length
                ? t("projects.loading.more", { count: projects.length })
                : t("projects.loading.initial")}
            </div>
          )}

          {/* Projects Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project, index) => (
              <ProjectCard key={project.fullName} project={project} index={index} />
            ))}
          </div>

          {filteredProjects.length === 0 && (
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
    </MainLayout>
  );
}

function ProjectCard({ project, index }: { project: ProjectInfo; index: number }) {
  const { t } = useTranslation();
  const status = project.archived ? "archived" : project.disabled ? "disabled" : "active";
  const updatedLabel = formatDate(project.updatedAt, t);
  const topics = project.topics?.slice(0, 6) ?? [];

  return (
    <motion.div
      key={project.fullName}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      className="glass-panel rounded-xl p-6 cursor-pointer gradient-border"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
            <Badge variant="outline" className={statusColors[status]}>
              {t(`projects.status.${status}`)}
            </Badge>
            {project.fork && (
              <Badge variant="outline" className="border-white/20 text-muted-foreground">
                {t("projects.status.fork")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {project.description ?? t("projects.noDescription")}
          </p>
          <p className="text-xs text-muted-foreground">
            {project.fullName}
          </p>
        </div>
        {status === "active" && (
          <a
            href={project.htmlUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={t("projects.openRepo")}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="bg-white/10 text-foreground">
              {topic}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GitCommit className="w-4 h-4" />
          <span>{t("projects.metrics.commits", { count: formatNumber(project.commits, t) })}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <GitBranch className="w-4 h-4" />
          <span>{t("projects.metrics.branches", { count: formatNumber(project.branches, t) })}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag className="w-4 h-4" />
          <span>{t("projects.metrics.tags", { count: formatNumber(project.tags, t) })}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {project.language && (
          <Badge variant="outline" className="bg-white/5 border-glass-border/30">
            {project.language}
          </Badge>
        )}
        {project.visibility && (
          <Badge variant="outline" className="bg-white/5 border-glass-border/30">
            {project.visibility}
          </Badge>
        )}
        {project.defaultBranch && (
          <Badge variant="outline" className="bg-white/5 border-glass-border/30">
            {t("projects.branch", { branch: project.defaultBranch })}
          </Badge>
        )}
        {project.license && (
          <Badge variant="outline" className="bg-white/5 border-glass-border/30">
            {project.license}
          </Badge>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-glass-border/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t("projects.owner", { owner: project.owner.login })}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("projects.updated", { date: updatedLabel })}
        </span>
      </div>
    </motion.div>
  );
}

function formatNumber(value: number | undefined, t: (key: string) => string): string {
  if (typeof value !== "number") return t("common.na");
  return value.toLocaleString("en-US");
}

function formatDate(value: string | undefined, t: (key: string) => string): string {
  if (!value) return t("common.unknown");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("common.unknown");
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
