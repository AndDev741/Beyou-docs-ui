import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { QuickAccessCards } from "@/components/dashboard/QuickAccessCards";
import { RecentActivity, type ActivityItem } from "@/components/dashboard/RecentActivity";
import { SystemOverview, type ArchitecturePreview, type SystemStat } from "@/components/dashboard/SystemOverview";
import { resolveArchitectureRepo } from "@/data/architectureRepo";
import { resolveProjectOrg, resolveProjectRepos } from "@/data/projectRepos";
import { resolveApiOrg, isGentlApiRepoName } from "@/data/apiRepos";
import { fetchArchitectureTopicDetail, fetchArchitectureTopics } from "@/lib/architectureApi";
import { fetchDesigns } from "@/lib/githubDesigns";
import { fetchOrgProjectsSummary, fetchProjectsByRepos } from "@/lib/githubProjects";
import type { ArchitectureTopicListItem } from "@/lib/architectureApi";
import type { OrgProjectsSummary, ProjectInfo } from "@/lib/githubProjects";
import { Code2, GitBranch, Palette, FolderKanban } from "lucide-react";
import { useTranslation } from "react-i18next";

const ORG_PREVIEW_LIMIT = 12;

type ProjectsSnapshot = {
  projects: ProjectInfo[];
  totalCount?: number;
  apiCount?: number;
  sampled: boolean;
};

const Index = () => {
  const { t, i18n } = useTranslation();
  const envArchRepo = import.meta.env.VITE_ARCH_REPO as string | undefined;
  const envProjectRepos = import.meta.env.VITE_PROJECT_REPOS as string | undefined;
  const envProjectOrg = import.meta.env.VITE_PROJECTS_ORG as string | undefined;

  const locale = useMemo(
    () => (i18n.language?.toLowerCase().startsWith("pt") ? "pt" : "en"),
    [i18n.language],
  );

  const repoConfig = useMemo(() => resolveArchitectureRepo(envArchRepo), [envArchRepo]);
  const projectRepos = useMemo(() => resolveProjectRepos(envProjectRepos), [envProjectRepos]);
  const projectOrg = useMemo(() => resolveProjectOrg(envProjectOrg), [envProjectOrg]);
  const apiOrg = useMemo(() => resolveApiOrg(envProjectOrg), [envProjectOrg]);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<SystemStat[]>([]);
  const [preview, setPreview] = useState<ArchitecturePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  const loadProjects = useCallback(async (): Promise<ProjectsSnapshot> => {
    if (projectRepos.length) {
      const entries = await fetchProjectsByRepos(projectRepos, undefined, { concurrency: 4 });
      const infos = entries
        .map((entry) => entry.info)
        .filter((info): info is ProjectInfo => Boolean(info));
      return {
        projects: infos,
        totalCount: infos.length,
        apiCount: infos.filter((info) => isGentlApiRepoName(info.repo.repo)).length,
        sampled: false,
      };
    }

    const summary: OrgProjectsSummary = await fetchOrgProjectsSummary(projectOrg, undefined, ORG_PREVIEW_LIMIT);
    return {
      projects: summary.repos,
      totalCount: summary.totalCount,
      apiCount: summary.apiCount,
      sampled: summary.sampled,
    };
  }, [projectRepos, projectOrg]);

  const loadRandomPreview = useCallback(async (topics: ArchitectureTopicListItem[]): Promise<ArchitecturePreview | null> => {
    if (!topics.length) return null;
    const pool = [...topics];
    const attempts = Math.min(pool.length, 4);

    for (let i = 0; i < attempts; i += 1) {
      const index = Math.floor(Math.random() * pool.length);
      const [topic] = pool.splice(index, 1);
      try {
        const detail = await fetchArchitectureTopicDetail(topic.key, locale);
        if (!detail.diagramMermaid?.trim()) continue;
        return {
          title: detail.title,
          code: detail.diagramMermaid,
          href: "/architecture",
        };
      } catch {
        continue;
      }
    }
    return null;
  }, [locale]);

  const loadHomeData = useCallback(async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    setLoading(true);
    setError(null);
    try {
      const [topicsResult, designsResult, projectsResult] = await Promise.allSettled([
        fetchArchitectureTopics(locale),
        fetchDesigns(repoConfig),
        loadProjects(),
      ]);

      if (loadIdRef.current !== loadId) return;

      const topics = topicsResult.status === "fulfilled" ? topicsResult.value : [];
      const designs = designsResult.status === "fulfilled" ? designsResult.value : [];
      const projectsSnapshot = projectsResult.status === "fulfilled"
        ? projectsResult.value
        : { projects: [], sampled: false };
      const projects = projectsSnapshot.projects;

      const failures = [topicsResult, designsResult, projectsResult]
        .filter((result) => result.status === "rejected")
        .map((result) => (result as PromiseRejectedResult).reason)
        .map((reason) => (reason instanceof Error ? reason.message : t("home.errors.load")));

      if (failures.length && !topics.length && !designs.length && !projects.length) {
        setError(failures[0]);
      }

      const apiRepos = projects.filter((project) => isGentlApiRepoName(project.repo.repo));
      const totalProjects = projectsSnapshot.totalCount ?? projects.length;
      const totalApis = projectsSnapshot.apiCount ?? apiRepos.length;

      const latestDesign = designs[0];
      const latestProject = pickLatest(projects, (item) => item.updatedAt ?? item.pushedAt);
      const latestApi = pickLatest(apiRepos, (item) => item.updatedAt ?? item.pushedAt);
      const latestTopic = pickLatest(topics, (item) => item.updatedAt);

      const activityItems: Array<{ item: ActivityItem; time: number }> = [];
      if (latestTopic) {
        const timestamp = toDate(latestTopic.updatedAt)?.getTime();
        activityItems.push({
          item: {
            type: "architecture",
            title: latestTopic.title,
            description: latestTopic.summary || t("home.activity.defaults.arch"),
            time: formatRelative(latestTopic.updatedAt, t),
            href: "/architecture",
          },
          time: timestamp ?? 0,
        });
      }
      if (latestDesign) {
        const timestamp = toDate(latestDesign.updatedAt)?.getTime();
        activityItems.push({
          item: {
            type: "design",
            title: latestDesign.title,
            description: t("home.activity.defaults.design", { category: latestDesign.category }),
            time: formatRelative(latestDesign.updatedAt, t),
            href: "/design",
          },
          time: timestamp ?? 0,
        });
      }
      if (latestApi) {
        const timestamp = toDate(latestApi.updatedAt ?? latestApi.pushedAt)?.getTime();
        activityItems.push({
          item: {
            type: "api",
            title: latestApi.name,
            description: latestApi.description ?? t("home.activity.defaults.api"),
            time: formatRelative(latestApi.updatedAt ?? latestApi.pushedAt, t),
            href: "/apis",
          },
          time: timestamp ?? 0,
        });
      }
      if (latestProject) {
        const timestamp = toDate(latestProject.updatedAt ?? latestProject.pushedAt)?.getTime();
        activityItems.push({
          item: {
            type: "project",
            title: latestProject.name,
            description: latestProject.description ?? t("home.activity.defaults.project"),
            time: formatRelative(latestProject.updatedAt ?? latestProject.pushedAt, t),
            href: "/projects",
          },
          time: timestamp ?? 0,
        });
      }

      activityItems.sort((a, b) => b.time - a.time);

      setActivity(activityItems.slice(0, 4).map((entry) => entry.item));

      const nextStats: SystemStat[] = [
        {
          icon: GitBranch,
          label: t("home.stats.architecture"),
          value: topics.length.toString(),
          subtext: latestTopic?.updatedAt
            ? t("home.stats.updated", { time: formatRelative(latestTopic.updatedAt, t) })
            : t("home.stats.noRecent"),
          status: topics.length ? "healthy" : "warning",
        },
        {
          icon: Palette,
          label: t("home.stats.designs"),
          value: designs.length.toString(),
          subtext: latestDesign?.updatedAt
            ? t("home.stats.updated", { time: formatRelative(latestDesign.updatedAt, t) })
            : t("home.stats.noRecent"),
          status: designs.length ? "healthy" : "warning",
        },
        {
          icon: Code2,
          label: t("home.stats.apis"),
          value: totalApis.toString(),
          subtext: projectRepos.length
            ? t("home.stats.customRepos")
            : typeof projectsSnapshot.apiCount === "number"
            ? t("home.stats.org", { org: apiOrg })
            : t("home.stats.sampled", { count: apiRepos.length }),
          status: totalApis ? "healthy" : "warning",
        },
        {
          icon: FolderKanban,
          label: t("home.stats.projects"),
          value: totalProjects.toString(),
          subtext: projectRepos.length
            ? t("home.stats.customRepos")
            : projectsSnapshot.sampled && totalProjects > projects.length
            ? t("home.stats.latest", { shown: projects.length, total: totalProjects })
            : t("home.stats.org", { org: projectOrg }),
          status: totalProjects ? "healthy" : "warning",
        },
      ];

      setStats(nextStats);
      if (loadIdRef.current === loadId) {
        setLoading(false);
      }

      void (async () => {
        const nextPreview = await loadRandomPreview(topics);
        if (loadIdRef.current !== loadId) return;
        setPreview(nextPreview);
      })();
    } catch (loadError) {
      if (loadIdRef.current !== loadId) return;
      setError(loadError instanceof Error ? loadError.message : t("home.errors.load"));
    } finally {
      if (loadIdRef.current === loadId) {
        setLoading(false);
      }
    }
  }, [
    repoConfig,
    locale,
    apiOrg,
    projectOrg,
    projectRepos.length,
    loadProjects,
    loadRandomPreview,
  ]);

  useEffect(() => {
    return () => {
      loadIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  return (
    <MainLayout>
      <div className="fade-in">
        <HeroSection />
        <QuickAccessCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <RecentActivity items={activity} loading={loading} error={error} />
          <SystemOverview stats={stats} preview={preview} loading={loading} error={error} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;

function toDate(value?: string | Date): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelative(value: string | Date | undefined, t: (key: string) => string): string {
  const date = toDate(value);
  if (!date) return t("common.unknown");
  return formatDistanceToNow(date, { addSuffix: true });
}

function pickLatest<T>(items: T[], getDate: (item: T) => string | undefined): T | null {
  let latest: { item: T; time: number } | null = null;
  items.forEach((item) => {
    const date = toDate(getDate(item));
    if (!date) return;
    const time = date.getTime();
    if (!latest || time > latest.time) {
      latest = { item, time };
    }
  });
  return latest?.item ?? null;
}
