import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  FileText,
  Folder,
  Link2,
  RefreshCcw,
  Search,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isGentlApiRepoName, resolveApiOrg, toApiRepoConfig } from "@/data/apiRepos";
import type {
  ApiCatalog,
  ApiOperation,
  ApiParameter,
  ApiPathDetail,
  ApiPathEntry,
  ApiResponse,
  ApiSchemaDetail,
  ApiSchemaEntry,
  ApiSchemaPointer,
  RepoConfig,
} from "@/lib/githubCatalog";
import { fetchApiCatalog, fetchPathDetail, fetchSchemaDetail, fetchSchemaDetailByPath } from "@/lib/githubCatalog";
import type { ProjectEntry, ProjectInfo } from "@/lib/githubProjects";
import { fetchOrgProjects } from "@/lib/githubProjects";
import { useTranslation } from "react-i18next";

type PathItem = ApiPathEntry & { repo: RepoConfig; id: string };
type SchemaItem = ApiSchemaEntry & { repo: RepoConfig; id: string };

type ActiveTab = "paths" | "schemas";

type SelectedItem =
  | { type: "path"; item: PathItem }
  | { type: "schema"; item: SchemaItem }
  | null;

const envProjectOrg = import.meta.env.VITE_PROJECTS_ORG as string | undefined;

function getRepoLabel(repo: RepoConfig): string {
  return repo.label ?? `${repo.owner}/${repo.repo}`;
}

function buildGithubUrl(repo: RepoConfig, filePath?: string): string {
  const ref = repo.ref ?? "main";
  if (!filePath) {
    return `https://github.com/${repo.owner}/${repo.repo}`;
  }
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${ref}/${filePath}`;
}

const methodStyles: Record<string, string> = {
  GET: "method-get",
  POST: "method-post",
  PUT: "method-put",
  DELETE: "method-delete",
  PATCH: "method-post",
  OPTIONS: "method-put",
  HEAD: "method-put",
};

function schemaKey(repo: RepoConfig, sourcePathOrName: string): string {
  return `${repo.id ?? repo.repo}::schema::${sourcePathOrName}`;
}

export default function APIs() {
  const { t } = useTranslation();
  const apiOrg = useMemo(() => resolveApiOrg(envProjectOrg), [envProjectOrg]);
  const [repoConfigs, setRepoConfigs] = useState<RepoConfig[]>([]);
  const [catalogs, setCatalogs] = useState<ApiCatalog[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("paths");
  const [selectedRepoId, setSelectedRepoId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathDetails, setPathDetails] = useState<Record<string, ApiPathDetail>>({});
  const [schemaDetails, setSchemaDetails] = useState<Record<string, ApiSchemaDetail>>({});
  const [schemaLoading, setSchemaLoading] = useState<Record<string, boolean>>({});
  const [schemaErrors, setSchemaErrors] = useState<Record<string, string>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    return () => {
      loadIdRef.current += 1;
    };
  }, []);

  const loadCatalogs = useCallback(async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;
    setLoading(true);
    setError(null);
    setCatalogs([]);
    setRepoConfigs([]);
    try {
      const repoOrder = new Map<string, number>();
      const seenRepos = new Set<string>();
      const queue: RepoConfig[] = [];
      const inFlight = new Set<string>();
      const maxConcurrent = 4;
      let active = 0;
      let doneListing = false;
      let resolveAll: (() => void) | null = null;
      const allDone = new Promise<void>((resolve) => {
        resolveAll = resolve;
      });

      const maybeFinish = () => {
        if (!doneListing || active > 0 || queue.length > 0) return;
        if (resolveAll) {
          resolveAll();
          resolveAll = null;
        }
      };

      const updateCatalogs = (catalog: ApiCatalog) => {
        const catalogId = catalog.repo.id ?? catalog.repo.repo;
        setCatalogs((prev) => {
          const existingIndex = prev.findIndex(
            (item) => (item.repo.id ?? item.repo.repo) === catalogId,
          );
          const next = existingIndex >= 0 ? [...prev] : [...prev, catalog];
          if (existingIndex >= 0) {
            next[existingIndex] = catalog;
          }
          next.sort((a, b) => {
            const aIndex = repoOrder.get(a.repo.id ?? a.repo.repo) ?? 0;
            const bIndex = repoOrder.get(b.repo.id ?? b.repo.repo) ?? 0;
            return aIndex - bIndex;
          });
          return next;
        });
      };

      const processQueue = () => {
        if (loadIdRef.current !== loadId) return;
        while (active < maxConcurrent && queue.length) {
          const repo = queue.shift() as RepoConfig;
          const repoId = repo.id ?? repo.repo;
          if (inFlight.has(repoId)) continue;
          inFlight.add(repoId);
          active += 1;
          fetchApiCatalog(repo)
            .then((catalog) => {
              if (loadIdRef.current !== loadId) return;
              updateCatalogs(catalog);
            })
            .catch((error) => {
              if (loadIdRef.current !== loadId) return;
              updateCatalogs({
                repo,
                paths: [],
                schemas: [],
                warnings: [],
                error: error instanceof Error ? error.message : t("apis.errors.loadRepo"),
              });
            })
            .finally(() => {
              active -= 1;
              inFlight.delete(repoId);
              if (queue.length) {
                processQueue();
              } else {
                maybeFinish();
              }
            });
        }
      };

      const enqueueRepos = (repos: RepoConfig[]) => {
        const nextRepos: RepoConfig[] = [];
        repos.forEach((repo) => {
          const repoId = repo.id ?? repo.repo;
          if (seenRepos.has(repoId)) return;
          seenRepos.add(repoId);
          repoOrder.set(repoId, repoOrder.size);
          nextRepos.push(repo);
        });
        if (!nextRepos.length) return;
        setRepoConfigs((prev) => {
          const next = [...prev, ...nextRepos];
          next.sort((a, b) => {
            const aIndex = repoOrder.get(a.id ?? a.repo) ?? 0;
            const bIndex = repoOrder.get(b.id ?? b.repo) ?? 0;
            return aIndex - bIndex;
          });
          return next;
        });
        queue.push(...nextRepos);
        processQueue();
      };

      const toApiRepos = (entries: ProjectEntry[]) => entries
        .map((entry) => entry.info)
        .filter((info): info is ProjectInfo => Boolean(info))
        .filter((info) => isGentlApiRepoName(info.repo.repo))
        .map((info) => toApiRepoConfig(info.repo, info.defaultBranch))
        .sort((a, b) => a.repo.localeCompare(b.repo));

      const entries = await fetchOrgProjects(apiOrg, undefined, {
        onProgress: (pageEntries) => {
          if (loadIdRef.current !== loadId) return;
          enqueueRepos(toApiRepos(pageEntries));
        },
      });
      if (loadIdRef.current !== loadId) return;
      enqueueRepos(toApiRepos(entries));
      doneListing = true;
      maybeFinish();
      await allDone;
    } catch (loadError) {
      if (loadIdRef.current !== loadId) return;
      setError(loadError instanceof Error ? loadError.message : t("apis.errors.loadRepos"));
    } finally {
      if (loadIdRef.current !== loadId) return;
      setLoading(false);
    }
  }, [apiOrg]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (!repoConfigs.length) {
      setSelectedRepoId("all");
      return;
    }
    setSelectedRepoId((current) => {
      const defaultId = repoConfigs.length === 1
        ? (repoConfigs[0].id ?? repoConfigs[0].repo)
        : "all";
      if (current === "all") return defaultId;
      const exists = repoConfigs.some((repo) => (repo.id ?? repo.repo) === current);
      return exists ? current : defaultId;
    });
  }, [repoConfigs]);

  const visibleCatalogs = useMemo(() => {
    if (selectedRepoId === "all") return catalogs;
    return catalogs.filter((catalog) => catalog.repo.id === selectedRepoId);
  }, [catalogs, selectedRepoId]);

  const selectedRepo = useMemo(
    () => repoConfigs.find((repo) => (repo.id ?? repo.repo) === selectedRepoId),
    [repoConfigs, selectedRepoId],
  );

  const pathItems = useMemo<PathItem[]>(() => {
    const items: PathItem[] = [];
    visibleCatalogs.forEach((catalog) => {
      catalog.paths.forEach((path) => {
        items.push({
          ...path,
          repo: catalog.repo,
          id: `${catalog.repo.id ?? catalog.repo.repo}::path::${path.path}`,
        });
      });
    });
    return items;
  }, [visibleCatalogs]);

  const schemaItems = useMemo<SchemaItem[]>(() => {
    const items: SchemaItem[] = [];
    visibleCatalogs.forEach((catalog) => {
      catalog.schemas.forEach((schema) => {
        items.push({
          ...schema,
          repo: catalog.repo,
          id: `${catalog.repo.id ?? catalog.repo.repo}::schema::${schema.name}`,
        });
      });
    });
    return items;
  }, [visibleCatalogs]);

  const filteredPaths = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return pathItems;
    return pathItems.filter((item) => {
      const repoLabel = getRepoLabel(item.repo).toLowerCase();
      return (
        item.path.toLowerCase().includes(trimmed) ||
        item.sourcePath?.toLowerCase().includes(trimmed) ||
        repoLabel.includes(trimmed)
      );
    });
  }, [pathItems, query]);

  const filteredSchemas = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return schemaItems;
    return schemaItems.filter((item) => {
      const repoLabel = getRepoLabel(item.repo).toLowerCase();
      return (
        item.name.toLowerCase().includes(trimmed) ||
        item.sourcePath?.toLowerCase().includes(trimmed) ||
        repoLabel.includes(trimmed)
      );
    });
  }, [schemaItems, query]);

  useEffect(() => {
    const list = activeTab === "paths" ? filteredPaths : filteredSchemas;
    if (!list.length) {
      setSelectedItemId(null);
      return;
    }
    if (!selectedItemId || !list.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(list[0].id);
    }
  }, [activeTab, filteredPaths, filteredSchemas, selectedItemId]);

  const selectedItem: SelectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === "paths") {
      const match = filteredPaths.find((item) => item.id === selectedItemId);
      return match ? { type: "path", item: match } : null;
    }
    const match = filteredSchemas.find((item) => item.id === selectedItemId);
    return match ? { type: "schema", item: match } : null;
  }, [activeTab, filteredPaths, filteredSchemas, selectedItemId]);

  const selectedPathDetail = selectedItem?.type === "path"
    ? pathDetails[selectedItem.item.id]
    : undefined;

  const selectedSchemaKey = selectedItem?.type === "schema"
    ? schemaKey(selectedItem.item.repo, selectedItem.item.sourcePath ?? selectedItem.item.name)
    : undefined;

  const selectedSchemaDetail = selectedSchemaKey ? schemaDetails[selectedSchemaKey] : undefined;

  useEffect(() => {
    if (!selectedItem) return;
    setDetailError(null);
    setDetailLoadingId(null);

    if (selectedItem.type === "path") {
      const key = selectedItem.item.id;
      if (pathDetails[key]) return;
      let cancelled = false;
      setDetailLoadingId(key);
      setDetailError(null);
      fetchPathDetail(selectedItem.item.repo, selectedItem.item)
        .then((detail) => {
          if (cancelled) return;
          setPathDetails((prev) => ({ ...prev, [key]: detail }));
        })
        .catch((loadError) => {
          if (cancelled) return;
          setDetailError(loadError instanceof Error ? loadError.message : t("apis.errors.loadApiDetails"));
        })
        .finally(() => {
          if (cancelled) return;
          setDetailLoadingId(null);
        });
      return () => {
        cancelled = true;
      };
    }

    if (selectedItem.type === "schema") {
      const key = schemaKey(selectedItem.item.repo, selectedItem.item.sourcePath ?? selectedItem.item.name);
      if (schemaDetails[key]) return;
      if (!selectedItem.item.sourcePath) {
        setDetailError(t("apis.errors.schemaSourceMissing"));
        return;
      }
      let cancelled = false;
      setDetailLoadingId(key);
      setDetailError(null);
      fetchSchemaDetail(selectedItem.item.repo, selectedItem.item)
        .then((detail) => {
          if (cancelled) return;
          setSchemaDetails((prev) => ({ ...prev, [key]: detail }));
        })
        .catch((loadError) => {
          if (cancelled) return;
          setDetailError(loadError instanceof Error ? loadError.message : t("apis.errors.loadSchemaDetails"));
        })
        .finally(() => {
          if (cancelled) return;
          setDetailLoadingId(null);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [selectedItem, pathDetails, schemaDetails]);

  const totalPaths = visibleCatalogs.reduce((acc, catalog) => acc + catalog.paths.length, 0);
  const totalSchemas = visibleCatalogs.reduce((acc, catalog) => acc + catalog.schemas.length, 0);
  const repoErrors = visibleCatalogs.filter((catalog) => catalog.error);

  const loadSchemaDetail = useCallback(
    (repo: RepoConfig, ref: string) => {
      const key = schemaKey(repo, ref);
      if (schemaDetails[key] || schemaLoading[key]) return;
      setSchemaLoading((prev) => ({ ...prev, [key]: true }));
      if (schemaErrors[key]) {
        setSchemaErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
      fetchSchemaDetailByPath(repo, ref)
        .then((detail) => {
          setSchemaDetails((prev) => ({ ...prev, [key]: detail }));
        })
        .catch((loadError) => {
          const message = loadError instanceof Error ? loadError.message : t("apis.errors.loadSchema");
          setSchemaErrors((prev) => ({ ...prev, [key]: message }));
        })
        .finally(() => {
          setSchemaLoading((prev) => ({ ...prev, [key]: false }));
        });
    },
    [schemaDetails, schemaLoading, schemaErrors],
  );

  useEffect(() => {
    if (!selectedItem || selectedItem.type !== "path") return;
    if (!selectedPathDetail) return;

    const refs = new Set<string>();
    selectedPathDetail.operations.forEach((operation) => {
      const requestRef = operation.requestBody?.schema?.ref;
      if (requestRef) refs.add(requestRef);
      operation.responses.forEach((response) => {
        const responseRef = response.schema?.ref;
        if (responseRef) refs.add(responseRef);
      });
    });

    refs.forEach((ref) => {
      if (!/\.(ya?ml|json)$/i.test(ref)) return;
      loadSchemaDetail(selectedItem.item.repo, ref);
    });
  }, [selectedItem, selectedPathDetail, loadSchemaDetail]);

  const handleRefresh = () => {
    void loadCatalogs();
  };

  const activeList = activeTab === "paths" ? filteredPaths : filteredSchemas;
  const dropdownTitle = selectedRepoId === "all"
    ? (repoConfigs.length ? t("apis.dropdown.all") : t("apis.dropdown.none"))
    : (selectedRepo ? getRepoLabel(selectedRepo) : t("apis.dropdown.title"));
  const dropdownSubtitle = selectedRepoId === "all"
    ? (repoConfigs.length ? t("apis.dropdown.count", { count: repoConfigs.length }) : t("apis.dropdown.empty"))
    : (selectedRepo ? `${selectedRepo.owner}/${selectedRepo.repo}` : "");
  const headerTitle = selectedRepoId === "all"
    ? t("apis.header.title")
    : (visibleCatalogs[0]?.repo ? getRepoLabel(visibleCatalogs[0].repo) : t("apis.header.title"));

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:h-[calc(100vh-64px)]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-96 border-b md:border-b-0 md:border-r border-glass-border/30 glass-panel flex flex-col max-h-[45vh] md:max-h-none"
        >
          <div className="p-4 border-b border-glass-border/30 space-y-4">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {dropdownTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dropdownSubtitle}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 bg-popover border-glass-border">
                  {repoConfigs.length > 1 && (
                    <DropdownMenuItem
                      key="all"
                      onClick={() => setSelectedRepoId("all")}
                      className="cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{t("apis.dropdown.all")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("apis.dropdown.count", { count: repoConfigs.length })}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {!repoConfigs.length && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                      {t("apis.dropdown.empty")}
                    </div>
                  )}
                  {repoConfigs.map((repo) => (
                    <DropdownMenuItem
                      key={repo.id ?? repo.repo}
                      onClick={() => setSelectedRepoId(repo.id ?? repo.repo)}
                      className="cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{getRepoLabel(repo)}</p>
                        <p className="text-xs text-muted-foreground">
                          {repo.owner}/{repo.repo}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label={t("common.refresh")}>
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("apis.search")}
                className="pl-9 bg-white/5 border-white/10"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {t("apis.count", { paths: totalPaths, schemas: totalSchemas })}
              </span>
              <div className="flex items-center gap-2">
                {loading && repoConfigs.length > 0 && (
                  <span>{t("apis.loading.progress", { loaded: catalogs.length, total: repoConfigs.length })}</span>
                )}
              </div>
            </div>

          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as ActiveTab)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="mx-4 mt-4">
                <TabsTrigger value="paths">{t("apis.tabs.paths")}</TabsTrigger>
                <TabsTrigger value="schemas">{t("apis.tabs.schemas")}</TabsTrigger>
              </TabsList>
              <TabsContent value="paths" className="flex-1 overflow-auto p-4 space-y-2">
                {loading && (
                  <div className="text-sm text-muted-foreground">{t("apis.loading.paths")}</div>
                )}
                {!loading && !filteredPaths.length && (
                  <div className="text-sm text-muted-foreground">{t("apis.empty.paths")}</div>
                )}
                {filteredPaths.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={cn(
                      "w-full flex flex-col gap-1 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                      selectedItemId === item.id
                        ? "bg-gradient-to-r from-primary/20 to-accent/20"
                        : "hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-mono text-foreground truncate">{item.path}</span>
                      {selectedRepoId === "all" && (
                        <Badge variant="outline" className="border-white/20 text-muted-foreground">
                          {getRepoLabel(item.repo)}
                        </Badge>
                      )}
                    </div>
                    {item.sourcePath && (
                      <span className="text-xs text-muted-foreground truncate">{item.sourcePath}</span>
                    )}
                  </button>
                ))}
              </TabsContent>
              <TabsContent value="schemas" className="flex-1 overflow-auto p-4 space-y-2">
                {loading && (
                  <div className="text-sm text-muted-foreground">{t("apis.loading.schemas")}</div>
                )}
                {!loading && !filteredSchemas.length && (
                  <div className="text-sm text-muted-foreground">{t("apis.empty.schemas")}</div>
                )}
                {filteredSchemas.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={cn(
                      "w-full flex flex-col gap-1 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                      selectedItemId === item.id
                        ? "bg-gradient-to-r from-primary/20 to-accent/20"
                        : "hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-mono text-foreground truncate">{item.name}</span>
                      {selectedRepoId === "all" && (
                        <Badge variant="outline" className="border-white/20 text-muted-foreground">
                          {getRepoLabel(item.repo)}
                        </Badge>
                      )}
                    </div>
                    {item.sourcePath && (
                      <span className="text-xs text-muted-foreground truncate">{item.sourcePath}</span>
                    )}
                  </button>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </motion.aside>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <motion.div
            key={`${selectedRepoId}-${activeTab}-${selectedItemId ?? "none"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl space-y-6"
          >
            <div className="glass-panel rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {headerTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedRepoId === "all"
                      ? t("apis.header.subtitleAll")
                      : visibleCatalogs[0]?.info?.title ?? t("apis.header.subtitleSingle")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white/10 text-foreground">
                    {t("apis.header.paths", { count: totalPaths })}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-foreground">
                    {t("apis.header.schemas", { count: totalSchemas })}
                  </Badge>
                </div>
              </div>

              {selectedRepoId !== "all" && visibleCatalogs[0] && (
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {visibleCatalogs[0].specFile && (
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      <span>{t("apis.header.spec", { spec: visibleCatalogs[0].specFile })}</span>
                    </div>
                  )}
                  {visibleCatalogs[0].info?.version && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{t("apis.header.version", { version: visibleCatalogs[0].info?.version })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="glass-panel rounded-xl p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {!!repoErrors.length && (
              <div className="glass-panel rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">{t("apis.errors.title")}</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {repoErrors.map((catalog) => (
                    <div key={catalog.repo.id ?? catalog.repo.repo} className="flex items-center justify-between">
                      <span>{getRepoLabel(catalog.repo)}</span>
                      <span>{catalog.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

              <div className="glass-panel rounded-xl p-6 space-y-4">
                {!selectedItem && (
                  <div className="text-sm text-muted-foreground">
                  {loading
                    ? t("apis.loading.details")
                    : activeList.length
                    ? t("apis.empty.select")
                    : t("apis.empty.items")}
                  </div>
                )}

              {detailError && (
                <div className="text-sm text-red-200">
                  {detailError}
                </div>
              )}

              {selectedItem?.type === "path" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">{t("apis.detail.pathLabel")}</p>
                        <code className="text-lg font-mono text-foreground">{selectedItem.item.path}</code>
                      </div>
                      <Badge variant="outline" className="border-white/20 text-muted-foreground">
                        {getRepoLabel(selectedItem.item.repo)}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      {selectedItem.item.sourcePath && (
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4" />
                          <span>{selectedItem.item.sourcePath}</span>
                        </div>
                      )}
                      {selectedItem.item.ref && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{selectedItem.item.ref}</span>
                        </div>
                      )}
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={buildGithubUrl(selectedItem.item.repo, selectedItem.item.sourcePath ?? selectedItem.item.ref)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <Link2 className="w-4 h-4" />
                        {t("apis.detail.viewDefinition")}
                      </a>
                    </Button>
                  </div>

                  {detailLoadingId === selectedItem.item.id && !selectedPathDetail && (
                    <div className="text-sm text-muted-foreground">{t("apis.loading.apiDetails")}</div>
                  )}

                  {selectedPathDetail && (
                    <div className="space-y-4">
                      {selectedPathDetail.operations.length ? (
                        selectedPathDetail.operations.map((operation) => (
                          <OperationCard
                            key={`${selectedPathDetail.path}-${operation.method}`}
                            path={selectedPathDetail.path}
                            operation={operation}
                            repo={selectedItem.item.repo}
                            schemaDetails={schemaDetails}
                            schemaLoading={schemaLoading}
                            schemaErrors={schemaErrors}
                            onLoadSchema={loadSchemaDetail}
                          />
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">{t("apis.empty.operations")}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedItem?.type === "schema" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t("apis.detail.schemaLabel")}</p>
                      <code className="text-lg font-mono text-foreground">{selectedItem.item.name}</code>
                    </div>
                    <Badge variant="outline" className="border-white/20 text-muted-foreground">
                      {getRepoLabel(selectedItem.item.repo)}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {selectedItem.item.sourcePath && (
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        <span>{selectedItem.item.sourcePath}</span>
                      </div>
                    )}
                    {selectedItem.item.ref && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{selectedItem.item.ref}</span>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={buildGithubUrl(selectedItem.item.repo, selectedItem.item.sourcePath ?? selectedItem.item.ref)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      {t("apis.detail.viewDefinition")}
                    </a>
                  </Button>

                  {detailLoadingId === selectedSchemaKey && !selectedSchemaDetail && (
                    <div className="text-sm text-muted-foreground">{t("apis.loading.schemaDetails")}</div>
                  )}

                  {selectedSchemaDetail && (
                    <SchemaDetailCard
                      detail={selectedSchemaDetail}
                      repo={selectedItem.item.repo}
                      schemaDetails={schemaDetails}
                      onLoadSchema={loadSchemaDetail}
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}

interface OperationCardProps {
  path: string;
  operation: ApiOperation;
  repo: RepoConfig;
  schemaDetails: Record<string, ApiSchemaDetail>;
  schemaLoading: Record<string, boolean>;
  schemaErrors: Record<string, string>;
  onLoadSchema: (repo: RepoConfig, ref: string) => void;
}

function OperationCard({
  path,
  operation,
  repo,
  schemaDetails,
  schemaLoading,
  schemaErrors,
  onLoadSchema,
}: OperationCardProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-glass-border/30 bg-white/5 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-mono font-semibold rounded border",
              methodStyles[operation.method] ?? "border-white/20 text-muted-foreground bg-white/5",
            )}
          >
            {operation.method}
          </span>
          <code className="text-sm font-mono text-foreground">{path}</code>
        </div>
        {operation.operationId && (
          <Badge variant="outline" className="border-white/20 text-muted-foreground">
            {operation.operationId}
          </Badge>
        )}
      </div>

      {(operation.summary || operation.description) && (
        <p className="text-sm text-muted-foreground">
          {operation.summary ?? operation.description}
        </p>
      )}

      {operation.tags && operation.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {operation.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-white/10 text-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase text-muted-foreground">{t("apis.detail.parameters")}</p>
        {operation.parameters.length ? (
          <div className="space-y-2">
            {operation.parameters.map((parameter, index) => (
              <ParameterRow key={`${parameter.name ?? parameter.ref ?? index}`} parameter={parameter} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t("apis.detail.noParameters")}</div>
        )}
      </div>

      {operation.requestBody && (
        <SchemaBlock
          title={t("apis.detail.requestBody")}
          description={operation.requestBody.description}
          contentType={operation.requestBody.contentType}
          schema={operation.requestBody.schema}
          repo={repo}
          schemaDetails={schemaDetails}
          schemaLoading={schemaLoading}
          schemaErrors={schemaErrors}
          onLoadSchema={onLoadSchema}
        />
      )}

      <div className="space-y-3">
        <p className="text-xs uppercase text-muted-foreground">{t("apis.detail.responses")}</p>
        {operation.responses.length ? (
          <div className="space-y-3">
            {operation.responses.map((response) => (
              <ResponseBlock
                key={response.status}
                response={response}
                repo={repo}
                schemaDetails={schemaDetails}
                schemaLoading={schemaLoading}
                schemaErrors={schemaErrors}
                onLoadSchema={onLoadSchema}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t("apis.detail.noResponses")}</div>
        )}
      </div>
    </div>
  );
}

function ParameterRow({ parameter }: { parameter: ApiParameter }) {
  const { t } = useTranslation();
  const label = parameter.name ?? parameter.ref ?? t("apis.detail.parameter");
  const typeLabel = parameter.type ?? (parameter.ref ? t("apis.detail.ref") : t("apis.detail.unknown"));
  return (
    <div className="flex items-start gap-4 py-2 border-b border-glass-border/20 last:border-0">
      <div className="min-w-32 space-y-1">
        <code className="text-sm font-mono text-foreground">{label}</code>
        {parameter.in && (
          <span className="text-xs text-muted-foreground">{t("apis.detail.in", { location: parameter.in })}</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
        {typeLabel}
      </span>
      {parameter.required && (
        <span className="text-xs text-accent">*</span>
      )}
      <p className="text-sm text-muted-foreground flex-1">
        {parameter.description ?? parameter.ref ?? t("apis.detail.noDescription")}
      </p>
    </div>
  );
}

interface ResponseBlockProps {
  response: ApiResponse;
  repo: RepoConfig;
  schemaDetails: Record<string, ApiSchemaDetail>;
  schemaLoading: Record<string, boolean>;
  schemaErrors: Record<string, string>;
  onLoadSchema: (repo: RepoConfig, ref: string) => void;
}

function ResponseBlock({ response, repo, schemaDetails, schemaLoading, schemaErrors, onLoadSchema }: ResponseBlockProps) {
  const { t } = useTranslation();
  const statusClass = response.status.startsWith("2")
    ? "status-healthy"
    : response.status.startsWith("4")
      ? "status-warning"
      : "status-error";
  return (
    <div className="rounded-lg border border-glass-border/30 bg-white/5 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn("text-xs", statusClass)}>{response.status}</Badge>
        {response.description && (
          <span className="text-sm text-muted-foreground">{response.description}</span>
        )}
        {response.contentType && (
          <Badge variant="outline" className="border-white/20 text-muted-foreground">
            {response.contentType}
          </Badge>
        )}
      </div>
      {response.schema ? (
        <SchemaPreview
          schema={response.schema}
          contentType={response.contentType}
          repo={repo}
          schemaDetails={schemaDetails}
          schemaLoading={schemaLoading}
          schemaErrors={schemaErrors}
          onLoadSchema={onLoadSchema}
        />
      ) : (
        <div className="text-sm text-muted-foreground">{t("apis.detail.noSchema")}</div>
      )}
    </div>
  );
}

interface SchemaBlockProps {
  title: string;
  description?: string;
  contentType?: string;
  schema?: ApiSchemaPointer;
  repo: RepoConfig;
  schemaDetails: Record<string, ApiSchemaDetail>;
  schemaLoading: Record<string, boolean>;
  schemaErrors: Record<string, string>;
  onLoadSchema: (repo: RepoConfig, ref: string) => void;
}

function SchemaBlock({
  title,
  description,
  contentType,
  schema,
  repo,
  schemaDetails,
  schemaLoading,
  schemaErrors,
  onLoadSchema,
}: SchemaBlockProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-glass-border/30 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {contentType && (
          <Badge variant="outline" className="border-white/20 text-muted-foreground">
            {contentType}
          </Badge>
        )}
      </div>
      {schema ? (
        <SchemaPreview
          schema={schema}
          contentType={contentType}
          repo={repo}
          schemaDetails={schemaDetails}
          schemaLoading={schemaLoading}
          schemaErrors={schemaErrors}
          onLoadSchema={onLoadSchema}
        />
      ) : (
        <div className="text-sm text-muted-foreground">{t("apis.detail.noSchema")}</div>
      )}
    </div>
  );
}

interface SchemaPreviewProps {
  schema: ApiSchemaPointer;
  contentType?: string;
  repo: RepoConfig;
  schemaDetails: Record<string, ApiSchemaDetail>;
  schemaLoading: Record<string, boolean>;
  schemaErrors: Record<string, string>;
  onLoadSchema: (repo: RepoConfig, ref: string) => void;
}

function SchemaPreview({
  schema,
  repo,
  schemaDetails,
  schemaLoading,
  schemaErrors,
  onLoadSchema,
}: SchemaPreviewProps) {
  const { t } = useTranslation();
  const refValue = schema.ref;
  const isFileRef = refValue ? /\.(ya?ml|json)$/i.test(refValue) : false;
  const key = refValue ? schemaKey(repo, refValue) : "";
  const detail = key ? schemaDetails[key] : undefined;
  const loading = key ? schemaLoading[key] : false;
  const error = key ? schemaErrors[key] : undefined;
  const merged = detail ? resolveMergedProperties(detail, repo, schemaDetails) : undefined;
  const missingRefsKey = merged?.missingRefs.join("|") ?? "";

  useEffect(() => {
    if (!refValue) return;
    if (!isFileRef) return;
    if (detail || error) return;
    onLoadSchema(repo, refValue);
  }, [refValue, repo, onLoadSchema, isFileRef, detail, error]);

  useEffect(() => {
    if (!merged) return;
    if (!merged.missingRefs.length) return;
    merged.missingRefs.forEach((ref) => {
      onLoadSchema(repo, ref);
    });
  }, [merged, repo, onLoadSchema, missingRefsKey]);

  if (refValue) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{schema.name ?? t("apis.detail.schemaLabel")}</p>
            <p className="text-xs text-muted-foreground">{refValue}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a
              href={buildGithubUrl(repo, refValue)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              {t("apis.detail.viewSchema")}
            </a>
          </Button>
        </div>
        {detail ? (
          <JsonPreview value={buildExampleFromSchemaProperties(merged?.properties ?? detail.properties)} />
        ) : error ? (
          <div className="text-sm text-red-200">{t("apis.detail.schemaError", { error })}</div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground">{t("apis.loading.schemaDetails")}</div>
        ) : isFileRef ? (
          <div className="text-sm text-muted-foreground">{t("apis.loading.schemaDetails")}</div>
        ) : (
          <div className="text-sm text-muted-foreground">{t("apis.detail.schemaUnavailable")}</div>
        )}
      </div>
    );
  }

  if (schema.inline) {
    return (
      <JsonPreview value={buildExampleFromInlineSchema(schema.inline)} />
    );
  }

  return <div className="text-sm text-muted-foreground">{t("apis.detail.schemaUnavailable")}</div>;
}

function SchemaDetailCard({
  detail,
  repo,
  schemaDetails,
  onLoadSchema,
}: {
  detail: ApiSchemaDetail;
  repo: RepoConfig;
  schemaDetails: Record<string, ApiSchemaDetail>;
  onLoadSchema: (repo: RepoConfig, ref: string) => void;
}) {
  const { t } = useTranslation();
  const merged = resolveMergedProperties(detail, repo, schemaDetails);
  const properties = [...merged.properties].sort((a, b) => a.name.localeCompare(b.name));
  const missingRefsKey = merged.missingRefs.join("|");

  useEffect(() => {
    if (!merged.missingRefs.length) return;
    merged.missingRefs.forEach((ref) => onLoadSchema(repo, ref));
  }, [merged, repo, onLoadSchema, missingRefsKey]);
  return (
    <div className="space-y-4">
      {detail.description && (
        <p className="text-sm text-muted-foreground">{detail.description}</p>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {detail.type && <span>{t("apis.detail.type", { type: detail.type })}</span>}
        {!!properties.length && <span>{t("apis.detail.fieldsCount", { count: properties.length })}</span>}
      </div>

      <JsonPreview value={buildExampleFromSchemaProperties(properties)} />

      {detail.composedOf.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {detail.composedOf.map((entry) => (
            <Badge key={entry.ref ?? entry.name} variant="outline" className="border-white/20 text-muted-foreground">
              {entry.name ?? entry.ref}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase text-muted-foreground">{t("apis.detail.fields")}</p>
        {properties.length ? (
          <div className="space-y-2">
            {properties.map((property) => (
              <SchemaPropertyRow key={property.name} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t("apis.detail.noFields")}</div>
        )}
      </div>
    </div>
  );
}

function SchemaPropertyRow({ property }: { property: ApiSchemaDetail["properties"][number] }) {
  const { t } = useTranslation();
  const typeLabel = formatPropertyType(property);
  const description = property.description
    ? property.enum?.length
      ? `${property.description} (enum: ${property.enum.join(", ")})`
      : property.description
    : property.enum?.length
      ? `enum: ${property.enum.join(", ")}`
      : t("apis.detail.noDescription");
  return (
    <div className="flex items-start gap-4 py-2 border-b border-glass-border/20 last:border-0">
      <div className="min-w-32 space-y-1">
        <code className="text-sm font-mono text-foreground">{property.name}</code>
        {property.required && <span className="text-xs text-accent">*</span>}
      </div>
      <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
        {typeLabel}
      </span>
      <p className="text-sm text-muted-foreground flex-1">{description}</p>
    </div>
  );
}

function formatPropertyType(property: ApiSchemaDetail["properties"][number]): string {
  if (property.type === "array") {
    return property.itemsType ? `array<${property.itemsType}>` : "array";
  }
  const baseType = property.type ?? "object";
  const formatted = property.format ? `${baseType} (${property.format})` : baseType;
  return property.nullable ? `${formatted} | null` : formatted;
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="text-xs text-muted-foreground bg-black/30 rounded-lg p-3 overflow-x-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function resolveMergedProperties(
  detail: ApiSchemaDetail,
  repo: RepoConfig,
  schemaDetails: Record<string, ApiSchemaDetail>,
): { properties: ApiSchemaDetail["properties"]; missingRefs: string[] } {
  const propertyMap = new Map<string, ApiSchemaDetail["properties"][number]>();
  const missingRefs = new Set<string>();
  const visited = new Set<string>();

  const mergeDetail = (current: ApiSchemaDetail, key?: string) => {
    if (key) {
      if (visited.has(key)) return;
      visited.add(key);
    }

    current.composedOf.forEach((entry) => {
      const ref = entry.ref;
      if (!ref || !/\.(ya?ml|json)$/i.test(ref)) return;
      const refKey = schemaKey(repo, ref);
      const refDetail = schemaDetails[refKey];
      if (!refDetail) {
        missingRefs.add(ref);
        return;
      }
      mergeDetail(refDetail, refKey);
    });

    current.properties.forEach((property) => {
      propertyMap.set(property.name, property);
    });
  };

  mergeDetail(detail, schemaKey(repo, detail.sourcePath ?? detail.name));

  return {
    properties: Array.from(propertyMap.values()),
    missingRefs: Array.from(missingRefs).sort(),
  };
}

function buildExampleFromSchemaDetail(detail: ApiSchemaDetail): Record<string, unknown> {
  return buildExampleFromSchemaProperties(detail.properties);
}

function buildExampleFromSchemaProperties(
  properties: ApiSchemaDetail["properties"],
): Record<string, unknown> {
  const example: Record<string, unknown> = {};
  properties.forEach((property) => {
    example[property.name] = buildExampleFromProperty(property);
  });
  return example;
}

function buildExampleFromProperty(property: ApiSchemaDetail["properties"][number]): unknown {
  if (property.enum && property.enum.length) return property.enum[0];
  if (property.type === "array") {
    const itemValue = buildExampleFromItemsType(property.itemsType);
    return [itemValue];
  }

  return buildExampleFromType(property.type, property.format);
}

function buildExampleFromItemsType(itemsType?: string): unknown {
  if (!itemsType) return {};
  return buildExampleFromType(itemsType, undefined);
}

function buildExampleFromInlineSchema(schema: unknown): unknown {
  if (schema && typeof schema === "object") {
    const record = schema as Record<string, unknown>;
    if (Array.isArray(record.enum) && record.enum.length) {
      return record.enum[0];
    }
    if (record.type === "object" && record.properties && typeof record.properties === "object") {
      const result: Record<string, unknown> = {};
      Object.entries(record.properties as Record<string, unknown>).forEach(([key, value]) => {
        result[key] = buildExampleFromInlineSchema(value);
      });
      return result;
    }
    if (record.type === "array") {
      return [buildExampleFromInlineSchema(record.items)];
    }
    if (typeof record.type === "string") {
      return buildExampleFromType(record.type, typeof record.format === "string" ? record.format : undefined);
    }
  }
  return schema;
}

function buildExampleFromType(type?: string, format?: string): unknown {
  if (!type) return {};
  const normalized = type.split("|")[0].trim().toLowerCase();
  if (normalized.includes("string")) {
    if (format === "uuid") return "uuid";
    if (format === "date-time") return "2024-01-01T00:00:00Z";
    return "string";
  }
  if (normalized.includes("boolean")) return false;
  if (normalized.includes("integer") || normalized.includes("number")) return 0;
  if (normalized.includes("object")) return {};
  return "value";
}
