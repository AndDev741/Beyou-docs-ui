import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEventHandler,
  type WheelEventHandler,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import mermaid from "mermaid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  Layers,
  Link2,
  Maximize2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Loader2,
  Code2,
  BoxSelect,
  Copy,
  Trash2,
  Sparkles,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { resolveArchitectureRepo } from "@/data/architectureRepo";
import { resolveProjectOrg } from "@/data/projectRepos";
import type { AiProvider } from "@/lib/aiAssist";
import { AI_PROVIDERS, fetchAiCompletion } from "@/lib/aiAssist";
import { getStoredAiKey, getStoredAiModel, persistAiModel } from "@/lib/aiSettings";
import type { ArchitectureTopic, TopicAssets } from "@/lib/githubArchitecture";
import {
  buildTopicIndexYaml,
  deleteArchitectureFile,
  fetchArchitectureTopics,
  fetchTopicAssets,
  fetchTopicFile,
  saveArchitectureFile,
} from "@/lib/githubArchitecture";
import type { ProjectInfo } from "@/lib/githubProjects";
import { fetchOrgProjects } from "@/lib/githubProjects";
import {
  FlowBuilder,
  createDefaultFlowDiagram,
  flowDiagramToMermaid,
  parseFlowDiagram,
  serializeFlowDiagram,
} from "@/components/architecture/FlowBuilder";
import { useTranslation } from "react-i18next";

const envArchRepo = import.meta.env.VITE_ARCH_REPO as string | undefined;
const envProjectOrg = import.meta.env.VITE_PROJECTS_ORG as string | undefined;
const envOpenAiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
const envDeepSeekKey = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined;
const envOpenAiModel = import.meta.env.VITE_OPENAI_MODEL as string | undefined;
const envDeepSeekModel = import.meta.env.VITE_DEEPSEEK_MODEL as string | undefined;

const DEFAULT_DIAGRAM = `graph TD
  A[New Architecture] --> B[Component]
`;

let mermaidInitialized = false;

type TabKey = "diagrams" | "docs" | "metadata";

type MetadataDraft = {
  title: string;
  description: string;
  tags: string;
  linkedProjects: string[];
};

type AiMode = "edit" | "create";
type AiDocMode = "edit" | "create";
type AiChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  format?: "builder" | "mermaid";
  appliedTo?: string;
  isError?: boolean;
};

export default function Architecture() {
  const { t } = useTranslation();
  const repoConfig = useMemo(() => resolveArchitectureRepo(envArchRepo), [envArchRepo]);
  const projectOrg = useMemo(() => resolveProjectOrg(envProjectOrg), [envProjectOrg]);
  const canCreate = false;
  const canEdit = false;
  const canDelete = false;
  const isReadOnly = true;
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialTopicParam] = useState(() => searchParams.get("topic"));
  const [initialTabParam] = useState(() => searchParams.get("tab"));
  const [initialDiagramParam] = useState(() => searchParams.get("diagram"));
  const [initialDocParam] = useState(() => searchParams.get("doc"));

  const [topics, setTopics] = useState<ArchitectureTopic[]>([]);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | null>(initialTopicParam);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const [topicAssets, setTopicAssets] = useState<Record<string, TopicAssets>>({});
  const [assetsLoading, setAssetsLoading] = useState<Record<string, boolean>>({});

  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>({});
  const [fileLoading, setFileLoading] = useState<Record<string, boolean>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [savingFiles, setSavingFiles] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (initialTabParam === "docs" || initialTabParam === "metadata") {
      return initialTabParam;
    }
    return "diagrams";
  });
  const [activeDiagramPath, setActiveDiagramPath] = useState<string | null>(null);
  const [activeDocPath, setActiveDocPath] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const [metaDraft, setMetaDraft] = useState<MetadataDraft | null>(null);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [diagramDialogOpen, setDiagramDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);

  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const [newTopicTags, setNewTopicTags] = useState("");
  const [newTopicLinkedProjects, setNewTopicLinkedProjects] = useState<string[]>([]);
  const [newDiagramName, setNewDiagramName] = useState("overview");
  const [newDiagramKind, setNewDiagramKind] = useState<"mermaid" | "builder">("builder");
  const [newDiagramContent, setNewDiagramContent] = useState(
    serializeFlowDiagram(createDefaultFlowDiagram()),
  );
  const [newDocName, setNewDocName] = useState("readme");
  const [newDocContent, setNewDocContent] = useState("# Architecture Notes\n");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);

  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetContent, setNewAssetContent] = useState("");
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetSaving, setAssetSaving] = useState(false);
  const [syncMermaid, setSyncMermaid] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDocOpen, setDeleteDocOpen] = useState(false);
  const [deleteDocError, setDeleteDocError] = useState<string | null>(null);
  const [deleteDocLoading, setDeleteDocLoading] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>("edit");
  const [aiProvider, setAiProvider] = useState<AiProvider>("openai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiFormat, setAiFormat] = useState<"builder" | "mermaid">("builder");
  const [aiDiagramName, setAiDiagramName] = useState("ai-diagram");
  const [aiChat, setAiChat] = useState<AiChatEntry[]>([]);
  const [aiModels, setAiModels] = useState<Record<AiProvider, string>>({
    openai: getStoredAiModel("openai") || envOpenAiModel || AI_PROVIDERS.openai.defaultModel,
    deepseek: getStoredAiModel("deepseek") || envDeepSeekModel || AI_PROVIDERS.deepseek.defaultModel,
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDocOpen, setAiDocOpen] = useState(false);
  const [aiDocMode, setAiDocMode] = useState<AiDocMode>("edit");
  const [aiDocPrompt, setAiDocPrompt] = useState("");
  const [aiDocName, setAiDocName] = useState("ai-doc");
  const [aiDocPreview, setAiDocPreview] = useState("");
  const [aiDocLoading, setAiDocLoading] = useState(false);
  const [aiDocError, setAiDocError] = useState<string | null>(null);
  const canAiGenerate = aiMode === "create" ? canCreate : canEdit;
  const canAiDocGenerate = aiDocMode === "create" ? canCreate : canEdit;

  const [projectsCatalog, setProjectsCatalog] = useState<ProjectInfo[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const data = await fetchArchitectureTopics(repoConfig);
      setTopics(data);
    } catch (error) {
      setTopicsError(error instanceof Error ? error.message : t("architecture.errors.loadTopics"));
    } finally {
      setTopicsLoading(false);
    }
  }, [repoConfig]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  const loadProjectsCatalog = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const entries = await fetchOrgProjects(projectOrg);
      const infos = entries
        .map((entry) => entry.info)
        .filter((info): info is ProjectInfo => Boolean(info))
        .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
      setProjectsCatalog(infos);
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : t("architecture.errors.loadProjects"));
    } finally {
      setProjectsLoading(false);
    }
  }, [projectOrg]);

  useEffect(() => {
    void loadProjectsCatalog();
  }, [loadProjectsCatalog]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((topic) => {
      topic.tags.forEach((tag) => set.add(tag));
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [topics]);

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((topic) => {
      topic.linkedProjects.forEach((project) => set.add(project));
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [topics]);

  const filteredTopics = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    return topics.filter((topic) => {
      if (tagFilter !== "all" && !topic.tags.includes(tagFilter)) return false;
      if (projectFilter !== "all" && !topic.linkedProjects.includes(projectFilter)) return false;
      if (!trimmed) return true;
      const fields = [
        topic.title,
        topic.description ?? "",
        topic.slug,
        ...topic.tags,
        ...topic.linkedProjects,
      ];
      return fields.some((field) => field.toLowerCase().includes(trimmed));
    });
  }, [topics, searchQuery, tagFilter, projectFilter]);

  useEffect(() => {
    if (!filteredTopics.length) {
      setSelectedTopicSlug(null);
      return;
    }
    if (!selectedTopicSlug || !filteredTopics.some((topic) => topic.slug === selectedTopicSlug)) {
      setSelectedTopicSlug(filteredTopics[0].slug);
    }
  }, [filteredTopics, selectedTopicSlug]);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.slug === selectedTopicSlug) ?? null,
    [topics, selectedTopicSlug],
  );

  const selectedAssets = selectedTopic ? topicAssets[selectedTopic.slug] : undefined;
  const diagrams = selectedAssets?.diagrams ?? [];
  const docs = selectedAssets?.docs ?? [];
  const activeDiagram = diagrams.find((diagram) => diagram.path === activeDiagramPath) ?? null;
  const activeDoc = docs.find((doc) => doc.path === activeDocPath) ?? null;
  const activeDiagramFormat = activeDiagram?.format
    ?? (activeDiagramPath?.toLowerCase().endsWith(".flow.json") ? "builder" : "mermaid");

  const providerEnvKey = aiProvider === "openai" ? envOpenAiKey : envDeepSeekKey;
  const storedAiKey = getStoredAiKey(aiProvider);
  const effectiveAiKey = storedAiKey || providerEnvKey || "";

  useEffect(() => {
    if (aiMode === "edit" && activeDiagramFormat) {
      setAiFormat(activeDiagramFormat);
    }
  }, [aiMode, activeDiagramFormat]);

  useEffect(() => {
    persistAiModel("openai", aiModels.openai);
  }, [aiModels.openai]);

  useEffect(() => {
    persistAiModel("deepseek", aiModels.deepseek);
  }, [aiModels.deepseek]);

  useEffect(() => {
    if (!aiOpen && !aiDocOpen) return;
    setAiModels({
      openai: getStoredAiModel("openai") || envOpenAiModel || AI_PROVIDERS.openai.defaultModel,
      deepseek: getStoredAiModel("deepseek") || envDeepSeekModel || AI_PROVIDERS.deepseek.defaultModel,
    });
    if (aiOpen) {
      setAiError(null);
    }
    if (aiDocOpen) {
      setAiDocError(null);
    }
  }, [aiOpen, aiDocOpen, envOpenAiModel, envDeepSeekModel]);

  useEffect(() => {
    if (!deleteDialogOpen) {
      setDeleteError(null);
    }
  }, [deleteDialogOpen]);

  useEffect(() => {
    if (!deleteDocOpen) {
      setDeleteDocError(null);
    }
  }, [deleteDocOpen]);

  useEffect(() => {
    if (!aiDocOpen) return;
    setAiDocPrompt("");
    setAiDocPreview("");
    setAiDocError(null);
  }, [aiDocOpen]);

  const loadAssets = useCallback(
    async (topicSlug: string) => {
      if (assetsLoading[topicSlug]) return;
      setAssetsLoading((prev) => ({ ...prev, [topicSlug]: true }));
      try {
        const data = await fetchTopicAssets(repoConfig, topicSlug);
        setTopicAssets((prev) => ({ ...prev, [topicSlug]: data }));
      } catch {
        setTopicAssets((prev) => ({ ...prev, [topicSlug]: { diagrams: [], docs: [] } }));
      } finally {
        setAssetsLoading((prev) => ({ ...prev, [topicSlug]: false }));
      }
    },
    [assetsLoading, repoConfig],
  );

  useEffect(() => {
    if (!selectedTopic) return;
    if (topicAssets[selectedTopic.slug]) return;
    void loadAssets(selectedTopic.slug);
  }, [selectedTopic, topicAssets, loadAssets]);

  useEffect(() => {
    if (!selectedTopic) return;
    if (!diagrams.length) {
      setActiveDiagramPath(null);
      return;
    }
    if (activeDiagramPath && diagrams.some((diagram) => diagram.path === activeDiagramPath)) {
      return;
    }
    if (initialDiagramParam) {
      const match = diagrams.find(
        (diagram) => diagram.path === initialDiagramParam || diagram.name === initialDiagramParam,
      );
      if (match) {
        setActiveDiagramPath(match.path);
        return;
      }
    }
    setActiveDiagramPath(diagrams[0].path);
  }, [selectedTopic, diagrams, activeDiagramPath, initialDiagramParam]);

  useEffect(() => {
    if (!selectedTopic) return;
    if (!docs.length) {
      setActiveDocPath(null);
      return;
    }
    if (activeDocPath && docs.some((doc) => doc.path === activeDocPath)) {
      return;
    }
    if (initialDocParam) {
      const match = docs.find((doc) => doc.path === initialDocParam || doc.name === initialDocParam);
      if (match) {
        setActiveDocPath(match.path);
        return;
      }
    }
    setActiveDocPath(docs[0].path);
  }, [selectedTopic, docs, activeDocPath, initialDocParam]);

  const loadFile = useCallback(
    async (path: string | null) => {
      if (!path) return;
      if (Object.prototype.hasOwnProperty.call(fileContents, path) || fileLoading[path]) return;
      setFileLoading((prev) => ({ ...prev, [path]: true }));
      setFileErrors((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
      try {
        const content = await fetchTopicFile(repoConfig, path);
        setFileContents((prev) => ({ ...prev, [path]: content }));
        setFileDrafts((prev) => ({ ...prev, [path]: content }));
      } catch (error) {
        setFileErrors((prev) => ({
          ...prev,
          [path]: error instanceof Error ? error.message : t("architecture.errors.loadFile"),
        }));
      } finally {
        setFileLoading((prev) => ({ ...prev, [path]: false }));
      }
    },
    [fileContents, fileLoading, repoConfig],
  );

  useEffect(() => {
    void loadFile(activeDiagramPath);
  }, [activeDiagramPath, loadFile]);

  useEffect(() => {
    void loadFile(activeDocPath);
  }, [activeDocPath, loadFile]);

  useEffect(() => {
    if (!selectedTopic) {
      setMetaDraft(null);
      return;
    }
    setMetaDraft({
      title: selectedTopic.title,
      description: selectedTopic.description ?? "",
      tags: selectedTopic.tags.join(", "),
      linkedProjects: selectedTopic.linkedProjects,
    });
    setMetaError(null);
  }, [selectedTopic]);

  useEffect(() => {
    if (!selectedTopicSlug) return;
    const next = new URLSearchParams(searchParams);
    next.set("topic", selectedTopicSlug);
    next.set("tab", activeTab);
    if (activeTab === "diagrams" && activeDiagramPath) {
      next.set("diagram", activeDiagramPath);
    } else {
      next.delete("diagram");
    }
    if (activeTab === "docs" && activeDocPath) {
      next.set("doc", activeDocPath);
    } else {
      next.delete("doc");
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    selectedTopicSlug,
    activeTab,
    activeDiagramPath,
    activeDocPath,
    searchParams,
    setSearchParams,
  ]);

  const diagramContent = activeDiagramPath
    ? fileDrafts[activeDiagramPath] ?? fileContents[activeDiagramPath] ?? ""
    : "";
  const docContent = activeDocPath
    ? fileDrafts[activeDocPath] ?? fileContents[activeDocPath] ?? ""
    : "";
  const fullscreenDiagram = useMemo(() => {
    if (!activeDiagramPath) {
      return { kind: "empty" as const };
    }
    if (activeDiagramFormat === "builder") {
      return { kind: "builder" as const, parsed: parseFlowDiagram(diagramContent) };
    }
    return { kind: "mermaid" as const, code: diagramContent };
  }, [activeDiagramPath, activeDiagramFormat, diagramContent]);
  const fullscreenLoading = activeDiagramPath ? Boolean(fileLoading[activeDiagramPath]) : false;

  const diagramLink = useMemo(() => {
    if (!selectedTopic || !activeDiagramPath) return "";
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("topic", selectedTopic.slug);
    url.searchParams.set("tab", "diagrams");
    url.searchParams.set("diagram", activeDiagramPath);
    url.searchParams.delete("doc");
    return url.toString();
  }, [selectedTopic, activeDiagramPath]);

  const handleDraftChange = (path: string | null, value: string) => {
    if (!canEdit) return;
    if (!path) return;
    setFileDrafts((prev) => ({ ...prev, [path]: value }));
  };

  const clearFileState = (path: string) => {
    setFileContents((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setFileDrafts((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setFileLoading((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setFileErrors((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setSavingFiles((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const handleSaveFile = async (path: string | null, label: string) => {
    if (!path) return;
    if (!canEdit) return;
    const content = fileDrafts[path] ?? fileContents[path] ?? "";
    setSavingFiles((prev) => ({ ...prev, [path]: true }));
    try {
      await saveArchitectureFile(repoConfig, path, content, `docs-ui: update ${label}`);
      setFileContents((prev) => ({ ...prev, [path]: content }));
      setFileDrafts((prev) => ({ ...prev, [path]: content }));
      if (selectedTopic) {
        setTopics((prev) =>
          prev.map((topic) =>
            topic.slug === selectedTopic.slug
              ? { ...topic, updatedAt: new Date().toISOString() }
              : topic,
          ),
        );
      }
    } catch (error) {
      setFileErrors((prev) => ({
        ...prev,
        [path]: error instanceof Error ? error.message : "Failed to save file",
      }));
    } finally {
      setSavingFiles((prev) => ({ ...prev, [path]: false }));
    }
  };

  const handleSaveBuilder = async (path: string | null, diagram: ReturnType<typeof parseFlowDiagram>) => {
    if (!path || !canEdit) return;
    if (diagram.error) return;
    const content = serializeFlowDiagram(diagram.diagram);
    setSavingFiles((prev) => ({ ...prev, [path]: true }));
    try {
      await saveArchitectureFile(repoConfig, path, content, "docs-ui: update flow diagram");
      setFileContents((prev) => ({ ...prev, [path]: content }));
      setFileDrafts((prev) => ({ ...prev, [path]: content }));
      if (syncMermaid) {
        const mermaidContent = flowDiagramToMermaid(diagram.diagram);
        const mermaidPath = path.replace(/\.flow\.json$/i, ".mmd");
        await saveArchitectureFile(repoConfig, mermaidPath, `${mermaidContent}\n`, "docs-ui: sync mermaid");
      }
      if (selectedTopic) {
        setTopics((prev) =>
          prev.map((topic) =>
            topic.slug === selectedTopic.slug
              ? { ...topic, updatedAt: new Date().toISOString() }
              : topic,
          ),
        );
      }
    } catch (error) {
      setFileErrors((prev) => ({
        ...prev,
        [path]: error instanceof Error ? error.message : "Failed to save diagram",
      }));
    } finally {
      setSavingFiles((prev) => ({ ...prev, [path]: false }));
    }
  };

  const handleDeleteDiagram = async () => {
    if (!activeDiagramPath || !selectedTopic || !canDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const deletePaths = new Set([activeDiagramPath]);
    const companionPath = activeDiagramPath.replace(/\.flow\.json$/i, ".mmd");
    if (activeDiagramFormat === "builder" && companionPath !== activeDiagramPath) {
      deletePaths.add(companionPath);
    }
    try {
      await deleteArchitectureFile(
        repoConfig,
        activeDiagramPath,
        `docs-ui: delete diagram ${activeDiagramPath}`,
      );
      if (activeDiagramFormat === "builder" && companionPath !== activeDiagramPath) {
        await deleteArchitectureFile(
          repoConfig,
          companionPath,
          `docs-ui: delete mermaid companion ${activeDiagramPath}`,
        );
      }
      setTopicAssets((prev) => {
        const existing = prev[selectedTopic.slug];
        if (!existing) return prev;
        return {
          ...prev,
          [selectedTopic.slug]: {
            ...existing,
            diagrams: existing.diagrams.filter((diagram) => !deletePaths.has(diagram.path)),
          },
        };
      });
      deletePaths.forEach((path) => clearFileState(path));
      setActiveDiagramPath(null);
      setTopics((prev) =>
        prev.map((topic) =>
          topic.slug === selectedTopic.slug
            ? { ...topic, updatedAt: new Date().toISOString() }
            : topic,
        ),
      );
      setDeleteDialogOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete diagram");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!activeDocPath || !selectedTopic || !canDelete) return;
    setDeleteDocLoading(true);
    setDeleteDocError(null);
    try {
      await deleteArchitectureFile(
        repoConfig,
        activeDocPath,
        `docs-ui: delete doc ${activeDocPath}`,
      );
      setTopicAssets((prev) => {
        const existing = prev[selectedTopic.slug];
        if (!existing) return prev;
        return {
          ...prev,
          [selectedTopic.slug]: {
            ...existing,
            docs: existing.docs.filter((doc) => doc.path !== activeDocPath),
          },
        };
      });
      clearFileState(activeDocPath);
      setActiveDocPath(null);
      setTopics((prev) =>
        prev.map((topic) =>
          topic.slug === selectedTopic.slug
            ? { ...topic, updatedAt: new Date().toISOString() }
            : topic,
        ),
      );
      setDeleteDocOpen(false);
    } catch (error) {
      setDeleteDocError(error instanceof Error ? error.message : "Failed to delete doc");
    } finally {
      setDeleteDocLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedTopic || !metaDraft || !canEdit) return;
    setMetaSaving(true);
    setMetaError(null);
    try {
      const content = buildTopicIndexYaml({
        title: metaDraft.title.trim() || selectedTopic.slug,
        description: metaDraft.description.trim() || undefined,
        tags: parseCsv(metaDraft.tags),
        linkedProjects: metaDraft.linkedProjects,
      });
      await saveArchitectureFile(
        repoConfig,
        selectedTopic.sourcePath,
        content,
        `docs-ui: update architecture topic ${selectedTopic.slug}`,
      );
      setTopics((prev) =>
        prev.map((topic) =>
          topic.slug === selectedTopic.slug
            ? {
                ...topic,
                title: metaDraft.title.trim() || topic.slug,
                description: metaDraft.description.trim() || undefined,
                tags: parseCsv(metaDraft.tags),
                linkedProjects: metaDraft.linkedProjects,
                updatedAt: new Date().toISOString(),
              }
            : topic,
        ),
      );
    } catch (error) {
      setMetaError(error instanceof Error ? error.message : "Failed to update metadata");
    } finally {
      setMetaSaving(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!canCreate) {
      setCreateError("You do not have permission to create topics.");
      return;
    }
    const slugSource = newTopicName || newTopicTitle;
    const slug = toSlug(slugSource);
    if (!slug) {
      setCreateError("Topic slug is required.");
      return;
    }
    setCreateError(null);
    setCreateSaving(true);
    try {
      const basePath = `topics/${slug}`;
      const indexContent = buildTopicIndexYaml({
        title: newTopicTitle.trim() || slug,
        description: newTopicDescription.trim() || undefined,
        tags: parseCsv(newTopicTags),
        linkedProjects: newTopicLinkedProjects,
      });
      await saveArchitectureFile(
        repoConfig,
        `${basePath}/index.yml`,
        indexContent,
        `docs-ui: add architecture topic ${slug}`,
      );
      if (newDiagramName.trim()) {
        const diagramExtension = newDiagramKind === "builder" ? ".flow.json" : ".mmd";
        const diagramPath = `${basePath}/diagrams/${ensureExtension(newDiagramName.trim(), diagramExtension)}`;
        await saveArchitectureFile(
          repoConfig,
          diagramPath,
          newDiagramContent || (newDiagramKind === "builder"
            ? serializeFlowDiagram(createDefaultFlowDiagram())
            : DEFAULT_DIAGRAM),
          `docs-ui: add diagram ${slug}`,
        );
      }
      if (newDocName.trim()) {
        const docPath = `${basePath}/docs/${ensureExtension(newDocName.trim(), ".md")}`;
        await saveArchitectureFile(
          repoConfig,
          docPath,
          newDocContent || "# Notes\n",
          `docs-ui: add docs ${slug}`,
        );
      }
      setTopicDialogOpen(false);
      setNewTopicName("");
      setNewTopicTitle("");
      setNewTopicDescription("");
      setNewTopicTags("");
      setNewTopicLinkedProjects([]);
      setNewDiagramName("overview");
      setNewDiagramKind("builder");
      setNewDiagramContent(serializeFlowDiagram(createDefaultFlowDiagram()));
      setNewDocName("readme");
      setNewDocContent("# Architecture Notes\n");
      await loadTopics();
      setSelectedTopicSlug(slug);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create topic");
    } finally {
      setCreateSaving(false);
    }
  };

  const handleCreateAsset = async (type: "diagram" | "doc") => {
    if (!canCreate) {
      setAssetError("You do not have permission to create assets.");
      return;
    }
    if (!selectedTopic) return;
    const name = newAssetName.trim();
    if (!name) {
      setAssetError("File name is required.");
      return;
    }
    setAssetSaving(true);
    setAssetError(null);
    try {
      const basePath = `topics/${selectedTopic.slug}/${type === "diagram" ? "diagrams" : "docs"}`;
      const extension = type === "diagram"
        ? newDiagramKind === "builder"
          ? ".flow.json"
          : ".mmd"
        : ".md";
      const path = `${basePath}/${ensureExtension(name, extension)}`;
      const content = newAssetContent
        || (type === "diagram"
          ? newDiagramKind === "builder"
            ? serializeFlowDiagram(createDefaultFlowDiagram())
            : DEFAULT_DIAGRAM
          : "# Notes\n");
      await saveArchitectureFile(
        repoConfig,
        path,
        content,
        `docs-ui: add ${type} ${selectedTopic.slug}`,
      );
      await loadAssets(selectedTopic.slug);
      if (type === "diagram") {
        setActiveDiagramPath(path);
      } else {
        setActiveDocPath(path);
      }
      setDiagramDialogOpen(false);
      setDocDialogOpen(false);
      setNewAssetName("");
      setNewAssetContent("");
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Failed to create file");
    } finally {
      setAssetSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    if (aiMode === "create" && !canCreate) {
      setAiError("You do not have permission to create diagrams.");
      return;
    }
    if (aiMode === "edit" && !canEdit) {
      setAiError("You do not have permission to edit diagrams.");
      return;
    }
    if (!effectiveAiKey) {
      setAiError("Add an API key in Settings before generating.");
      return;
    }
    if (!selectedTopic) {
      setAiError("Select a topic first.");
      return;
    }
    if (aiMode === "edit" && !activeDiagramPath) {
      setAiError("Select a diagram to edit.");
      return;
    }
    if (aiMode === "create" && !aiDiagramName.trim()) {
      setAiError("Provide a name for the new diagram.");
      return;
    }

    const outputFormat = aiMode === "edit" ? activeDiagramFormat : aiFormat;
    const instruction = aiPrompt.trim();
    if (!instruction) {
      setAiError("Describe what you want the AI to build.");
      return;
    }

    const userMessage: AiChatEntry = {
      id: `user-${Date.now()}`,
      role: "user",
      content: instruction,
    };
    setAiChat((prev) => [...prev, userMessage]);
    setAiPrompt("");

    const prompt = buildAiPrompt({
      mode: aiMode,
      format: outputFormat,
      instruction,
      existing: aiMode === "edit" ? diagramContent : "",
      topic: selectedTopic,
      linkedProjects: selectedTopic.linkedProjects,
    });

    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetchAiCompletion({
        provider: aiProvider,
        apiKey: effectiveAiKey,
        model: aiModels[aiProvider],
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: aiProvider === "deepseek" ? 0.2 : undefined,
      });

      let preview = "";
      let appliedLabel: string | undefined;

      if (outputFormat === "builder") {
        const jsonText = extractJson(response);
        const parsed = parseFlowDiagram(jsonText);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        const serialized = serializeFlowDiagram(parsed.diagram);
        preview = serialized;

        if (aiMode === "edit") {
          setFileDrafts((prev) => ({ ...prev, [activeDiagramPath as string]: serialized }));
          if (activeDiagramPath && !fileContents[activeDiagramPath]) {
            setFileContents((prev) => ({ ...prev, [activeDiagramPath]: serialized }));
          }
          appliedLabel = activeDiagramPath?.split("/").pop() ?? activeDiagramPath ?? undefined;
        } else {
          const name = aiDiagramName.trim();
          const basePath = `topics/${selectedTopic.slug}/diagrams`;
          const path = `${basePath}/${ensureExtension(name, ".flow.json")}`;
          await saveArchitectureFile(
            repoConfig,
            path,
            serialized,
            `docs-ui: add AI diagram ${selectedTopic.slug}`,
          );
          if (syncMermaid) {
            const mermaidContent = flowDiagramToMermaid(parsed.diagram);
            const mermaidPath = path.replace(/\.flow\.json$/i, ".mmd");
            await saveArchitectureFile(
              repoConfig,
              mermaidPath,
              `${mermaidContent}\n`,
              "docs-ui: sync mermaid",
            );
          }
          await loadAssets(selectedTopic.slug);
          setActiveTab("diagrams");
          setActiveDiagramPath(path);
          setFileContents((prev) => ({ ...prev, [path]: serialized }));
          setFileDrafts((prev) => ({ ...prev, [path]: serialized }));
          appliedLabel = path.split("/").pop() ?? path;
        }
      } else {
        const mermaid = extractMermaid(response);
        if (!mermaid) {
          throw new Error("AI response did not include Mermaid output.");
        }
        preview = mermaid;
        if (aiMode === "edit") {
          setFileDrafts((prev) => ({ ...prev, [activeDiagramPath as string]: mermaid }));
          if (activeDiagramPath && !fileContents[activeDiagramPath]) {
            setFileContents((prev) => ({ ...prev, [activeDiagramPath]: mermaid }));
          }
          appliedLabel = activeDiagramPath?.split("/").pop() ?? activeDiagramPath ?? undefined;
        } else {
          const name = aiDiagramName.trim();
          const basePath = `topics/${selectedTopic.slug}/diagrams`;
          const path = `${basePath}/${ensureExtension(name, ".mmd")}`;
          await saveArchitectureFile(
            repoConfig,
            path,
            `${mermaid}\n`,
            `docs-ui: add AI diagram ${selectedTopic.slug}`,
          );
          await loadAssets(selectedTopic.slug);
          setActiveTab("diagrams");
          setActiveDiagramPath(path);
          setFileContents((prev) => ({ ...prev, [path]: mermaid }));
          setFileDrafts((prev) => ({ ...prev, [path]: mermaid }));
          appliedLabel = path.split("/").pop() ?? path;
        }
      }

      setAiChat((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: preview,
          format: outputFormat,
          appliedTo: appliedLabel,
        },
      ]);
      if (aiMode === "create") {
        setAiMode("edit");
        setAiFormat(outputFormat);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed.";
      setAiError(message);
      setAiChat((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: message,
          isError: true,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiDocGenerate = async () => {
    if (aiDocMode === "create" && !canCreate) {
      setAiDocError("You do not have permission to create docs.");
      return;
    }
    if (aiDocMode === "edit" && !canEdit) {
      setAiDocError("You do not have permission to edit docs.");
      return;
    }
    if (!effectiveAiKey) {
      setAiDocError("Add an API key in Settings before generating.");
      return;
    }
    if (!selectedTopic) {
      setAiDocError("Select a topic first.");
      return;
    }
    if (aiDocMode === "edit" && !activeDocPath) {
      setAiDocError("Select a doc to edit.");
      return;
    }
    if (aiDocMode === "create" && !aiDocName.trim()) {
      setAiDocError("Provide a name for the new doc.");
      return;
    }
    const instruction = aiDocPrompt.trim();
    if (!instruction) {
      setAiDocError("Describe what you want the AI to write.");
      return;
    }

    const prompt = buildAiDocPrompt({
      mode: aiDocMode,
      instruction,
      existing: aiDocMode === "edit" ? docContent : "",
      topic: selectedTopic,
      linkedProjects: selectedTopic.linkedProjects,
      docName: aiDocMode === "create" ? aiDocName.trim() : undefined,
    });

    setAiDocLoading(true);
    setAiDocError(null);
    try {
      const response = await fetchAiCompletion({
        provider: aiProvider,
        apiKey: effectiveAiKey,
        model: aiModels[aiProvider],
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: aiProvider === "deepseek" ? 0.2 : undefined,
      });

      const markdown = extractMarkdown(response);
      if (!markdown) {
        throw new Error("AI response did not include Markdown output.");
      }
      setAiDocPreview(markdown);

      if (aiDocMode === "edit" && activeDocPath) {
        setFileDrafts((prev) => ({ ...prev, [activeDocPath]: markdown }));
        if (!fileContents[activeDocPath]) {
          setFileContents((prev) => ({ ...prev, [activeDocPath]: markdown }));
        }
        setActiveTab("docs");
      } else {
        const name = aiDocName.trim();
        const basePath = `topics/${selectedTopic.slug}/docs`;
        const path = `${basePath}/${ensureExtension(name, ".md")}`;
        await saveArchitectureFile(
          repoConfig,
          path,
          `${markdown}\n`,
          `docs-ui: add AI doc ${selectedTopic.slug}`,
        );
        await loadAssets(selectedTopic.slug);
        setActiveTab("docs");
        setActiveDocPath(path);
        setFileContents((prev) => ({ ...prev, [path]: markdown }));
        setFileDrafts((prev) => ({ ...prev, [path]: markdown }));
      }
      if (aiDocMode === "create") {
        setAiDocMode("edit");
      }
    } catch (error) {
      setAiDocError(error instanceof Error ? error.message : "AI request failed.");
    } finally {
      setAiDocLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:h-[calc(100vh-64px)]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-80 border-b md:border-b-0 md:border-r border-glass-border/30 glass-panel flex flex-col max-h-[45vh] md:max-h-none"
        >
          <div className="p-4 border-b border-glass-border/30 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{t("architecture.sidebar.title")}</p>
                <p className="text-xs text-muted-foreground">{repoConfig.owner}/{repoConfig.repo}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={loadTopics} aria-label={t("common.refresh")}>
                  <RefreshCcw className="w-4 h-4" />
                </Button>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!canCreate}
                    onClick={() => setTopicDialogOpen(true)}
                    aria-label={t("architecture.sidebar.newTopic")}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("architecture.sidebar.search")}
                className="pl-9 bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-full bg-white/5 border-glass-border/30">
                  <SelectValue placeholder={t("architecture.sidebar.tags")} />
                </SelectTrigger>
                <SelectContent>
                  {tagOptions.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag === "all" ? t("architecture.sidebar.allTags") : tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full bg-white/5 border-glass-border/30">
                  <SelectValue placeholder={t("architecture.sidebar.project")} />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((project) => (
                    <SelectItem key={project} value={project}>
                      {project === "all" ? t("architecture.sidebar.allProjects") : project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("architecture.sidebar.topicCount", { count: topics.length })}</span>
              {isReadOnly && <span className="text-amber-400">{t("common.readOnly")}</span>}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {topicsLoading && (
              <div className="text-sm text-muted-foreground">{t("architecture.sidebar.loadingTopics")}</div>
            )}
            {!topicsLoading && !filteredTopics.length && (
              <div className="text-sm text-muted-foreground">{t("architecture.sidebar.noTopics")}</div>
            )}
            {filteredTopics.map((topic) => (
              <button
                key={topic.slug}
                onClick={() => setSelectedTopicSlug(topic.slug)}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-2.5 space-y-2 transition-all duration-200",
                  selectedTopicSlug === topic.slug
                    ? "bg-gradient-to-r from-primary/20 to-accent/20"
                    : "hover:bg-white/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{topic.title}</span>
                  <Badge variant="outline" className="border-white/20 text-muted-foreground">
                    {topic.slug}
                  </Badge>
                </div>
                {topic.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{topic.description}</p>
                )}
                {topic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {topic.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-white/10 text-foreground text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.aside>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <motion.div
            key={selectedTopicSlug ?? "none"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl space-y-6"
          >
            {topicsError && (
              <div className="glass-panel rounded-xl p-4 text-sm text-red-200">
                {topicsError}
              </div>
            )}

            {!selectedTopic && (
              <div className="glass-panel rounded-xl p-6 text-sm text-muted-foreground">
                {topicsLoading ? t("architecture.sidebar.loadingTopics") : t("architecture.empty")}
              </div>
            )}

            {selectedTopic && (
              <div className="glass-panel rounded-xl p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold text-foreground">{selectedTopic.title}</h2>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedTopic.description ?? t("architecture.topic.noDescription")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-white/20 text-muted-foreground">
                        {selectedTopic.slug}
                      </Badge>
                      {selectedTopic.updatedAt && (
                        <span className="text-xs text-muted-foreground">
                          {t("architecture.topic.updated", { date: formatDate(selectedTopic.updatedAt) })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedTopic.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-white/10 text-foreground">
                        {tag}
                      </Badge>
                    ))}
                    {selectedTopic.linkedProjects.map((project) => (
                      <Badge key={project} variant="outline" className="border-white/20 text-muted-foreground">
                        {project}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
                  <TabsList>
                    <TabsTrigger value="diagrams">{t("architecture.tabs.diagrams")}</TabsTrigger>
                    <TabsTrigger value="docs">{t("architecture.tabs.docs")}</TabsTrigger>
                    <TabsTrigger value="metadata">{t("architecture.tabs.metadata")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="diagrams" className="pt-4">
                    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase text-muted-foreground">{t("architecture.diagrams.title")}</p>
                          {!isReadOnly && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canCreate}
                                onClick={() => {
                                  setAiMode("create");
                                  setAiOpen(true);
                                }}
                              >
                                <Sparkles className="w-4 h-4" />
                                AI
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canCreate}
                                onClick={() => {
                                  setNewAssetName("");
                                  setNewDiagramKind("builder");
                                  setNewAssetContent(serializeFlowDiagram(createDefaultFlowDiagram()));
                                  setAssetError(null);
                                  setDiagramDialogOpen(true);
                                }}
                              >
                                <Plus className="w-4 h-4" />
                                {t("architecture.diagrams.new")}
                              </Button>
                            </div>
                          )}
                        </div>
                        {assetsLoading[selectedTopic.slug] && (
                          <div className="text-sm text-muted-foreground">{t("architecture.diagrams.loading")}</div>
                        )}
                        {!assetsLoading[selectedTopic.slug] && !diagrams.length && (
                          <div className="text-sm text-muted-foreground">{t("architecture.diagrams.empty")}</div>
                        )}
                        <div className="space-y-2">
                          {diagrams.map((diagram) => (
                            <button
                              key={diagram.path}
                              onClick={() => setActiveDiagramPath(diagram.path)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                                activeDiagramPath === diagram.path
                                  ? "bg-white/10 text-foreground"
                                  : "text-muted-foreground hover:bg-white/5",
                              )}
                            >
                              {diagram.format === "builder" ? (
                                <BoxSelect className="w-4 h-4" />
                              ) : (
                                <Code2 className="w-4 h-4" />
                              )}
                              <span className="text-sm truncate">{diagram.name}</span>
                              {diagram.format === "builder" && (
                                <Badge variant="outline" className="border-white/20 text-muted-foreground text-[10px]">
                                  {t("architecture.diagrams.builder")}
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {activeDiagramPath ? (
                          <>
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="text-sm text-muted-foreground break-all">
                                {activeDiagramPath}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!diagramLink}
                                  onClick={() => {
                                    if (!diagramLink) return;
                                    window.open(diagramLink, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  <Link2 className="w-4 h-4" />
                                  {t("common.openLink")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setFullscreenOpen(true)}
                                >
                                  <Maximize2 className="w-4 h-4" />
                                  {t("common.fullScreen")}
                                </Button>
                              </div>
                            </div>

                            {fileErrors[activeDiagramPath] && (
                              <div className="text-sm text-red-200">
                                {fileErrors[activeDiagramPath]}
                              </div>
                            )}

                            {activeDiagramFormat === "builder" ? (
                              fileLoading[activeDiagramPath] ? (
                                <div className="text-sm text-muted-foreground">{t("architecture.diagrams.loading")}</div>
                              ) : (
                                <FlowDiagramPanel
                                  raw={diagramContent}
                                  onRawChange={(value) => handleDraftChange(activeDiagramPath, value)}
                                  projects={projectsCatalog}
                                  readOnly={isReadOnly}
                                  onMermaidCopy={() => {
                                    const parsed = parseFlowDiagram(diagramContent);
                                    if (parsed.error) return;
                                    void navigator.clipboard?.writeText(flowDiagramToMermaid(parsed.diagram));
                                  }}
                                />
                              )
                            ) : (
                              <>
                                {fileLoading[activeDiagramPath] ? (
                                  <div className="text-sm text-muted-foreground">{t("architecture.diagrams.loading")}</div>
                                ) : (
                                  <MermaidPreview code={diagramContent} />
                                )}
                                {!isReadOnly && (
                                  <Textarea
                                    value={diagramContent}
                                    onChange={(event) => handleDraftChange(activeDiagramPath, event.target.value)}
                                    className="min-h-[220px] bg-black/20 border-glass-border/30 font-mono text-xs"
                                    placeholder={t("architecture.diagrams.mermaidPlaceholder")}
                                    readOnly={isReadOnly}
                                  />
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">{t("architecture.diagrams.select")}</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="docs" className="pt-4">
                    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase text-muted-foreground">{t("architecture.docs.title")}</p>
                          {!isReadOnly && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canCreate}
                                onClick={() => {
                                  setAiDocMode("create");
                                  setAiDocOpen(true);
                                }}
                              >
                                <Sparkles className="w-4 h-4" />
                                AI
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canCreate}
                                onClick={() => {
                                  setNewAssetName("");
                                  setNewAssetContent("# Notes\\n");
                                  setAssetError(null);
                                  setDocDialogOpen(true);
                                }}
                              >
                                <Plus className="w-4 h-4" />
                                {t("architecture.docs.new")}
                              </Button>
                            </div>
                          )}
                        </div>
                        {assetsLoading[selectedTopic.slug] && (
                          <div className="text-sm text-muted-foreground">{t("architecture.docs.loading")}</div>
                        )}
                        {!assetsLoading[selectedTopic.slug] && !docs.length && (
                          <div className="text-sm text-muted-foreground">{t("architecture.docs.empty")}</div>
                        )}
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <button
                              key={doc.path}
                              onClick={() => setActiveDocPath(doc.path)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                                activeDocPath === doc.path
                                  ? "bg-white/10 text-foreground"
                                  : "text-muted-foreground hover:bg-white/5",
                              )}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-sm truncate">{doc.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {activeDocPath ? (
                          <>
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="text-sm text-muted-foreground break-all">
                                {activeDocPath}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap" />
                            </div>

                            {fileErrors[activeDocPath] && (
                              <div className="text-sm text-red-200">
                                {fileErrors[activeDocPath]}
                              </div>
                            )}

                            <div className="rounded-lg border border-glass-border/30 bg-black/10 p-4">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                className="prose prose-invert max-w-none text-sm"
                              >
                                {docContent || t("architecture.docs.noContent")}
                              </ReactMarkdown>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">{t("architecture.docs.select")}</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="metadata" className="pt-4">
                    {selectedTopic ? (
                      <div className="space-y-4 max-w-2xl">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">{t("architecture.metadata.title")}</p>
                          <p className="text-sm text-foreground">{selectedTopic.title}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">{t("architecture.metadata.description")}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedTopic.description ?? t("architecture.topic.noDescription")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">{t("architecture.metadata.tags")}</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTopic.tags.length ? (
                              selectedTopic.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="bg-white/10 text-foreground">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">{t("common.none")}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">{t("architecture.metadata.projects")}</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTopic.linkedProjects.length ? (
                              selectedTopic.linkedProjects.map((project) => (
                                <Badge key={project} variant="outline" className="border-white/20 text-muted-foreground">
                                  {project}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">{t("common.none")}</span>
                            )}
                          </div>
                        </div>

                        {selectedTopic.linkedProjects.length > 0 && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href="/projects" className="flex items-center gap-2">
                              <Link2 className="w-4 h-4" />
                              {t("architecture.metadata.viewProjects")}
                            </a>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">{t("architecture.metadata.empty")}</div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-glass-border/30">
            <DialogTitle>
              {activeDiagram?.name ?? t("architecture.preview.title")}
            </DialogTitle>
            <DialogDescription className="break-all">
              {activeDiagramPath ?? t("architecture.preview.empty")}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 h-[calc(92vh-96px)] overflow-auto">
            {fullscreenLoading ? (
              <div className="text-sm text-muted-foreground">{t("architecture.diagrams.loading")}</div>
            ) : fullscreenDiagram.kind === "builder" ? (
              fullscreenDiagram.parsed.error ? (
                <div className="text-sm text-red-200">
                  {t("architecture.preview.error", { error: fullscreenDiagram.parsed.error })}
                </div>
              ) : (
              <FlowBuilder
                  diagram={fullscreenDiagram.parsed.diagram}
                  onChange={(diagram) => {
                    if (!activeDiagramPath) return;
                    handleDraftChange(activeDiagramPath, serializeFlowDiagram(diagram));
                  }}
                  readOnly={isReadOnly}
                  projects={projectsCatalog}
                  canvasClassName="h-full min-h-0"
                  fullHeight
                />
              )
            ) : fullscreenDiagram.kind === "mermaid" ? (
              fullscreenDiagram.code ? (
                <MermaidPreview
                  code={fullscreenDiagram.code}
                  className="h-full min-h-0"
                  interactive
                  showControls
                />
              ) : (
                <div className="text-sm text-muted-foreground">{t("architecture.preview.select")}</div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">{t("architecture.preview.select")}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!isReadOnly && (
        <>
          <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Architecture Topic</DialogTitle>
                <DialogDescription>
                  Add a new architecture topic with diagrams and docs.
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Topic slug</p>
                    <Input
                      value={newTopicName}
                      onChange={(event) => setNewTopicName(event.target.value)}
                      placeholder="system-overview"
                      disabled={!canCreate}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Title</p>
                    <Input
                      value={newTopicTitle}
                      onChange={(event) => setNewTopicTitle(event.target.value)}
                      placeholder="System Overview"
                      disabled={!canCreate}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Description</p>
                    <Textarea
                      value={newTopicDescription}
                      onChange={(event) => setNewTopicDescription(event.target.value)}
                      placeholder="Short summary of the architecture scope"
                      disabled={!canCreate}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Tags</p>
                    <Input
                      value={newTopicTags}
                      onChange={(event) => setNewTopicTags(event.target.value)}
                      placeholder="backend, infra, data"
                      disabled={!canCreate}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Linked projects</p>
                    <ProjectPicker
                      projects={projectsCatalog}
                      loading={projectsLoading}
                      error={projectsError}
                      disabled={!canCreate}
                      selected={newTopicLinkedProjects}
                      onChange={setNewTopicLinkedProjects}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Initial diagram name</p>
                    <Input
                      value={newDiagramName}
                      onChange={(event) => setNewDiagramName(event.target.value)}
                      placeholder="overview"
                      disabled={!canCreate}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Diagram type</p>
                    <Select
                      value={newDiagramKind}
                      onValueChange={(value) => {
                        const nextKind = value as "mermaid" | "builder";
                        setNewDiagramKind(nextKind);
                        setNewDiagramContent(
                          nextKind === "builder"
                            ? serializeFlowDiagram(createDefaultFlowDiagram())
                            : DEFAULT_DIAGRAM,
                        );
                      }}
                      disabled={!canCreate}
                    >
                      <SelectTrigger className="bg-white/5 border-glass-border/30">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="builder">Builder (drag & drop)</SelectItem>
                        <SelectItem value="mermaid">Mermaid (code)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Diagram content</p>
                    <Textarea
                      value={newDiagramContent}
                      onChange={(event) => setNewDiagramContent(event.target.value)}
                      className="min-h-[140px] font-mono text-xs"
                      disabled={!canCreate}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Initial doc name</p>
                    <Input
                      value={newDocName}
                      onChange={(event) => setNewDocName(event.target.value)}
                      placeholder="readme"
                      disabled={!canCreate}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Doc content</p>
                    <Textarea
                      value={newDocContent}
                      onChange={(event) => setNewDocContent(event.target.value)}
                      className="min-h-[120px] font-mono text-xs"
                      disabled={!canCreate}
                    />
                  </div>
                </div>
              </div>

              {createError && (
                <div className="text-sm text-red-200">{createError}</div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setTopicDialogOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={!canCreate || createSaving} onClick={handleCreateTopic}>
                  {createSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create topic
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={diagramDialogOpen} onOpenChange={setDiagramDialogOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>New diagram</DialogTitle>
                <DialogDescription>Create a diagram for this topic.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Diagram name</p>
                  <Input
                    value={newAssetName}
                    onChange={(event) => setNewAssetName(event.target.value)}
                    placeholder="sequence"
                    disabled={!canCreate}
                  />
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Diagram type</p>
                  <Select
                    value={newDiagramKind}
                    onValueChange={(value) => {
                      const nextKind = value as "mermaid" | "builder";
                      setNewDiagramKind(nextKind);
                      setNewAssetContent(
                        nextKind === "builder"
                          ? serializeFlowDiagram(createDefaultFlowDiagram())
                          : DEFAULT_DIAGRAM,
                      );
                    }}
                    disabled={!canCreate}
                  >
                    <SelectTrigger className="bg-white/5 border-glass-border/30">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="builder">Builder (drag & drop)</SelectItem>
                      <SelectItem value="mermaid">Mermaid (code)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Diagram content</p>
                  <Textarea
                    value={newAssetContent}
                    onChange={(event) => setNewAssetContent(event.target.value)}
                    className="min-h-[160px] font-mono text-xs"
                    disabled={!canCreate}
                  />
                </div>
              </div>
              {assetError && <div className="text-sm text-red-200">{assetError}</div>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDiagramDialogOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={!canCreate || assetSaving} onClick={() => handleCreateAsset("diagram")}>
                  {assetSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create diagram
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>New doc</DialogTitle>
                <DialogDescription>Create a markdown doc for this topic.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Doc name</p>
                  <Input
                    value={newAssetName}
                    onChange={(event) => setNewAssetName(event.target.value)}
                    placeholder="readme"
                    disabled={!canCreate}
                  />
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Doc content</p>
                  <Textarea
                    value={newAssetContent}
                    onChange={(event) => setNewAssetContent(event.target.value)}
                    className="min-h-[160px] font-mono text-xs"
                    disabled={!canCreate}
                  />
                </div>
              </div>
              {assetError && <div className="text-sm text-red-200">{assetError}</div>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDocDialogOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={!canCreate || assetSaving} onClick={() => handleCreateAsset("doc")}>
                  {assetSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create doc
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>AI Diagram Assistant</DialogTitle>
            <DialogDescription>
              Generate or edit diagrams with OpenAI or DeepSeek. Configure keys in Settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Provider</p>
                <Select value={aiProvider} onValueChange={(value) => setAiProvider(value as AiProvider)}>
                  <SelectTrigger className="bg-white/5 border-glass-border/30">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AI_PROVIDERS).map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground">Model</p>
                <Input
                  value={aiModels[aiProvider]}
                  onChange={(event) =>
                    setAiModels((prev) => ({ ...prev, [aiProvider]: event.target.value }))
                  }
                  placeholder={AI_PROVIDERS[aiProvider].defaultModel}
                  className="bg-white/5 border-glass-border/30"
                />
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground">Mode</p>
                <Select value={aiMode} onValueChange={(value) => setAiMode(value as AiMode)}>
                  <SelectTrigger className="bg-white/5 border-glass-border/30">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edit" disabled={!canEdit}>Edit current diagram</SelectItem>
                    <SelectItem value="create" disabled={!canCreate}>Create new diagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {aiMode === "create" && (
                <>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Diagram name</p>
                    <Input
                      value={aiDiagramName}
                      onChange={(event) => setAiDiagramName(event.target.value)}
                      placeholder="ai-diagram"
                      className="bg-white/5 border-glass-border/30"
                      readOnly={!canCreate}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Output format</p>
                    <Select value={aiFormat} onValueChange={(value) => setAiFormat(value as "builder" | "mermaid")}>
                      <SelectTrigger className="bg-white/5 border-glass-border/30">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="builder">Builder (.flow.json)</SelectItem>
                        <SelectItem value="mermaid">Mermaid (.mmd)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="rounded-lg border border-glass-border/30 bg-white/5 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="uppercase text-muted-foreground">API key</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      storedAiKey
                        ? "bg-emerald-500/20 text-emerald-200"
                        : providerEnvKey
                        ? "bg-sky-500/20 text-sky-200"
                        : "bg-amber-500/20 text-amber-200",
                    )}
                  >
                    {storedAiKey ? "Saved" : providerEnvKey ? "Env" : "Missing"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {storedAiKey
                    ? "Stored locally in this browser."
                    : providerEnvKey
                    ? "Using the environment key from build config."
                    : "No key configured yet. Add one in Settings."}
                </p>
                <Button variant="link" size="sm" asChild className="px-0">
                  <Link to="/settings">Manage keys in Settings</Link>
                </Button>
              </div>

              {aiMode === "edit" && (
                <div className="text-xs text-muted-foreground">
                  Editing: {activeDiagramPath ?? "No diagram selected"}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted-foreground">AI chat</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiChat([])}
                  disabled={!aiChat.length}
                >
                  Clear
                </Button>
              </div>

              <div className="rounded-lg border border-glass-border/30 bg-black/20 p-3 max-h-[320px] overflow-auto space-y-3">
                {!aiChat.length && (
                  <div className="text-xs text-muted-foreground">
                    Start by describing the architecture you want to create or how to update the current diagram.
                  </div>
                )}
                {aiChat.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-lg border border-glass-border/30 p-3",
                      message.role === "user" ? "bg-white/5" : "bg-black/30",
                      message.isError && "border-red-500/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{message.role === "user" ? "You" : "AI"}</span>
                        {message.format && (
                          <Badge variant="outline" className="border-white/20 text-[9px]">
                            {message.format === "builder" ? "Builder JSON" : "Mermaid"}
                          </Badge>
                        )}
                      </div>
                      {message.appliedTo && (
                        <span className="text-emerald-200">Applied: {message.appliedTo}</span>
                      )}
                    </div>
                    {message.role === "user" ? (
                      <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <pre className="mt-2 text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-40 overflow-auto">
                        {message.content}
                      </pre>
                    )}
                  </div>
                ))}
                {aiLoading && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Working on your diagram...
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground">Request</p>
                <Textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void handleAiGenerate();
                    }
                  }}
                  placeholder="Describe the architecture you want to generate or how to update it."
                  className="min-h-[140px] bg-white/5 border-glass-border/30"
                  readOnly={!canAiGenerate}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Press Ctrl+Enter to send another request.
                </p>
              </div>

              {aiMode === "create" && aiFormat === "builder" && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={syncMermaid}
                    onChange={(event) => setSyncMermaid(event.target.checked)}
                    className="accent-purple-500"
                  />
                  Sync Mermaid companion file
                </label>
              )}

              {aiError && (
                <div className="text-sm text-red-200">{aiError}</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)}>
              Close
            </Button>
            <Button disabled={!canAiGenerate || aiLoading} onClick={handleAiGenerate}>
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiMode === "edit" ? "Apply" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          <Dialog open={aiDocOpen} onOpenChange={setAiDocOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>AI Doc Assistant</DialogTitle>
            <DialogDescription>
              Generate or edit architecture docs with OpenAI or DeepSeek. Configure keys in Settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Provider</p>
                <Select value={aiProvider} onValueChange={(value) => setAiProvider(value as AiProvider)}>
                  <SelectTrigger className="bg-white/5 border-glass-border/30">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AI_PROVIDERS).map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground">Model</p>
                <Input
                  value={aiModels[aiProvider]}
                  onChange={(event) =>
                    setAiModels((prev) => ({ ...prev, [aiProvider]: event.target.value }))
                  }
                  placeholder={AI_PROVIDERS[aiProvider].defaultModel}
                  className="bg-white/5 border-glass-border/30"
                />
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground">Mode</p>
                <Select value={aiDocMode} onValueChange={(value) => setAiDocMode(value as AiDocMode)}>
                  <SelectTrigger className="bg-white/5 border-glass-border/30">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edit" disabled={!canEdit}>Edit current doc</SelectItem>
                    <SelectItem value="create" disabled={!canCreate}>Create new doc</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {aiDocMode === "create" && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Doc name</p>
                  <Input
                    value={aiDocName}
                    onChange={(event) => setAiDocName(event.target.value)}
                    placeholder="ai-doc"
                    className="bg-white/5 border-glass-border/30"
                    readOnly={!canCreate}
                  />
                </div>
              )}

              <div className="rounded-lg border border-glass-border/30 bg-white/5 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="uppercase text-muted-foreground">API key</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      storedAiKey
                        ? "bg-emerald-500/20 text-emerald-200"
                        : providerEnvKey
                        ? "bg-sky-500/20 text-sky-200"
                        : "bg-amber-500/20 text-amber-200",
                    )}
                  >
                    {storedAiKey ? "Saved" : providerEnvKey ? "Env" : "Missing"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {storedAiKey
                    ? "Stored locally in this browser."
                    : providerEnvKey
                    ? "Using the environment key from build config."
                    : "No key configured yet. Add one in Settings."}
                </p>
                <Button variant="link" size="sm" asChild className="px-0">
                  <Link to="/settings">Manage keys in Settings</Link>
                </Button>
              </div>

              {aiDocMode === "edit" && (
                <div className="text-xs text-muted-foreground">
                  Editing: {activeDocPath ?? "No doc selected"}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Request</p>
                <Textarea
                  value={aiDocPrompt}
                  onChange={(event) => setAiDocPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void handleAiDocGenerate();
                    }
                  }}
                  placeholder="Describe the doc you want to generate or how to update it."
                  className="min-h-[160px] bg-white/5 border-glass-border/30"
                  readOnly={!canAiDocGenerate}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Press Ctrl+Enter to generate.
                </p>
              </div>

              {aiDocPreview && (
                <div className="rounded-lg border border-glass-border/30 bg-black/20 p-3 max-h-[260px] overflow-auto">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Preview</p>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none text-sm">
                    {aiDocPreview}
                  </ReactMarkdown>
                </div>
              )}

              {aiDocLoading && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Working on your doc...
                </div>
              )}

              {aiDocError && (
                <div className="text-sm text-red-200">{aiDocError}</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDocOpen(false)}>
              Close
            </Button>
            <Button disabled={!canAiDocGenerate || aiDocLoading} onClick={handleAiDocGenerate}>
              {aiDocLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiDocMode === "edit" ? "Apply" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
          </Dialog>
        </>
      )}
    </MainLayout>
  );
}

function MermaidPreview({
  code,
  className,
  interactive = false,
  showControls = false,
}: {
  code: string;
  className?: string;
  interactive?: boolean;
  showControls?: boolean;
}) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const { t } = useTranslation();

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "strict",
      });
      mermaidInitialized = true;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!code.trim()) {
      setSvg("");
      setError(null);
      return;
    }
    mermaid
      .render(`mermaid-${Math.random().toString(36).slice(2)}`, code)
      .then((result) => {
        if (cancelled) return;
        setSvg(result.svg);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSvg("");
        setError(err instanceof Error ? err.message : t("architecture.mermaid.renderError"));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
  }, [code, interactive]);

  if (error) {
    return <div className="text-sm text-red-200">{t("architecture.mermaid.error", { error })}</div>;
  }

  if (!svg) {
    return <div className="text-sm text-muted-foreground">{t("architecture.mermaid.empty")}</div>;
  }

  const content = (
    <div
      className={cn("rounded-lg border border-glass-border/30 bg-black/10 p-4 overflow-auto", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  if (!interactive) {
    return content;
  }

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const handleWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const delta = event.deltaY < 0 ? 1.12 : 0.9;
    const nextZoom = clamp(zoom * delta, 0.35, 3.5);
    const scaleChange = nextZoom / zoom;
    setZoom(nextZoom);
    setPan((prev) => ({
      x: pointerX - scaleChange * (pointerX - prev.x),
      y: pointerY - scaleChange * (pointerY - prev.y),
    }));
  };

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isPanning) return;
    setPan({
      x: event.clientX - panStartRef.current.x,
      y: event.clientY - panStartRef.current.y,
    });
  };

  const handlePointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={cn("relative rounded-lg border border-glass-border/30 bg-black/10", className)}>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden touch-none select-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        <div
          className="p-4"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {showControls && (
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setZoom((value) => clamp(value * 1.12, 0.35, 3.5))}
          >
            +
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setZoom((value) => clamp(value * 0.9, 0.35, 3.5))}
          >
            −
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            {t("architecture.mermaid.reset")}
          </Button>
        </div>
      )}
    </div>
  );
}

function FlowDiagramPanel({
  raw,
  onRawChange,
  projects,
  readOnly,
  onMermaidCopy,
}: {
  raw: string;
  onRawChange: (next: string) => void;
  projects: ProjectInfo[];
  readOnly: boolean;
  onMermaidCopy: () => void;
}) {
  const parsed = useMemo(() => parseFlowDiagram(raw), [raw]);
  const mermaid = useMemo(() => flowDiagramToMermaid(parsed.diagram), [parsed]);
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {parsed.error ? (
        <div className="text-sm text-red-200">
          {t("architecture.flow.error", { error: parsed.error })}
        </div>
      ) : (
        <>
          <FlowBuilder
            diagram={parsed.diagram}
            onChange={(diagram) => {
              if (readOnly) return;
              onRawChange(serializeFlowDiagram(diagram));
            }}
            readOnly={readOnly}
            projects={projects}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">{t("architecture.flow.mermaidOutput")}</p>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={onMermaidCopy}>
                <Copy className="w-4 h-4" />
                {t("architecture.flow.copyMermaid")}
              </Button>
            )}
          </div>
          <MermaidPreview code={mermaid} />
        </>
      )}

      <div>
        {!readOnly && (
          <>
            <p className="text-xs uppercase text-muted-foreground">{t("architecture.flow.rawJson")}</p>
            <Textarea
              value={raw}
              onChange={(event) => {
                if (readOnly) return;
                onRawChange(event.target.value);
              }}
              className="min-h-[200px] bg-black/20 border-glass-border/30 font-mono text-xs"
              placeholder={t("architecture.flow.placeholder")}
              readOnly={readOnly}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ProjectPicker({
  projects,
  selected,
  onChange,
  loading,
  error,
  disabled,
}: {
  projects: ProjectInfo[];
  selected: string[];
  onChange: (next: string[]) => void;
  loading: boolean;
  error: string | null;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmed) return projects;
    return projects.filter((project) => {
      const fields = [
        project.name,
        project.fullName,
        project.description ?? "",
      ];
      return fields.some((field) => field.toLowerCase().includes(trimmed));
    });
  }, [projects, trimmed]);

  const toggleProject = (fullName: string) => {
    if (disabled) return;
    if (selected.includes(fullName)) {
      onChange(selected.filter((item) => item !== fullName));
    } else {
      onChange([...selected, fullName]);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-glass-border/30 bg-white/5 p-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects"
          className="pl-9 bg-white/5 border-white/10"
          disabled={disabled}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Sorted by last update</span>
        <span>{selected.length} selected</span>
      </div>
      {loading && <div className="text-xs text-muted-foreground">Loading projects...</div>}
      {error && <div className="text-xs text-red-200">{error}</div>}
      {!loading && !error && (
        <div className="max-h-56 overflow-auto space-y-2 pr-1">
          {filtered.map((project) => {
            const isSelected = selected.includes(project.fullName);
            return (
              <label
                key={project.fullName}
                className={cn(
                  "flex items-start gap-2 rounded-lg p-2 border border-transparent hover:border-white/10 transition-colors",
                  isSelected && "bg-white/10",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleProject(project.fullName)}
                  disabled={disabled}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {project.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{project.fullName}</p>
                </div>
              </label>
            );
          })}
          {!filtered.length && (
            <div className="text-xs text-muted-foreground">No projects found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildAiPrompt({
  mode,
  format,
  instruction,
  existing,
  topic,
  linkedProjects,
}: {
  mode: AiMode;
  format: "builder" | "mermaid";
  instruction: string;
  existing: string;
  topic: ArchitectureTopic;
  linkedProjects: string[];
}): { system: string; user: string } {
  const system = format === "builder"
    ? [
        "You are a software architecture assistant.",
        "Return only valid JSON for the architecture builder. No markdown or commentary.",
        "Schema:",
        `{
  "version": 1,
  "direction": "LR" | "TB" | "RL" | "BT",
  "nodes": [
    {
      "id": "node-1",
      "type": "architecture",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Node Label",
        "role": "service|database|queue|api|ui|external|storage",
        "project": "owner/repo (optional)"
      }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2", "label": "optional" }
  ]
}`,
      ].join("\n")
    : [
        "You are a software architecture assistant.",
        "Return only Mermaid flowchart code. No markdown or commentary.",
        "Use flowchart syntax (flowchart LR/TB/RL/BT).",
      ].join("\n");

  const sections = [
    `Topic: ${topic.title} (${topic.slug})`,
    topic.description ? `Description: ${topic.description}` : "",
    linkedProjects.length
      ? `Available project ids: ${linkedProjects.join(", ")}`
      : "",
    `Task: ${mode === "edit" ? "Edit the existing diagram" : "Create a new diagram"}.\n${instruction}`,
    mode === "edit" && existing
      ? `Existing diagram:\n${existing}`
      : "",
  ].filter(Boolean);

  return {
    system,
    user: sections.join("\n\n"),
  };
}

function buildAiDocPrompt({
  mode,
  instruction,
  existing,
  topic,
  linkedProjects,
  docName,
}: {
  mode: AiDocMode;
  instruction: string;
  existing: string;
  topic: ArchitectureTopic;
  linkedProjects: string[];
  docName?: string;
}): { system: string; user: string } {
  const system = [
    "You are a technical documentation assistant for software architecture.",
    "Return only Markdown. No code fences or commentary.",
  ].join("\n");

  const sections = [
    `Topic: ${topic.title} (${topic.slug})`,
    topic.description ? `Description: ${topic.description}` : "",
    linkedProjects.length
      ? `Linked projects: ${linkedProjects.join(", ")}`
      : "",
    docName ? `Doc name: ${docName}` : "",
    `Task: ${mode === "edit" ? "Edit the existing doc" : "Create a new doc"}.\n${instruction}`,
    mode === "edit" && existing
      ? `Existing doc:\n${existing}`
      : "",
  ].filter(Boolean);

  return {
    system,
    user: sections.join("\n\n"),
  };
}

function extractJson(content: string): string {
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenceMatch ? fenceMatch[1] : content;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    return raw.slice(start, end + 1);
  }
  return raw.trim();
}

function extractMermaid(content: string): string {
  const fenceMatch = content.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  const raw = fenceMatch ? fenceMatch[1] : content;
  return sanitizeMermaid(raw.trim());
}

function extractMarkdown(content: string): string {
  const fenceMatch = content.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
  const raw = fenceMatch ? fenceMatch[1] : content;
  return raw.trim();
}

function sanitizeMermaid(value: string): string {
  let text = value.replace(/\r\n/g, "\n");

  // Replace literal "\n" sequences inside labels with <br/> to avoid parser issues.
  text = text.replace(/\\n/g, "<br/>");

  // Ensure subgraph "end" tokens are on their own line when AI returns them inline.
  text = text.replace(/([\]\)\}])\s+end\b/g, "$1\nend");

  // Remove unsupported linkStyle interpolation directives (Mermaid 11).
  text = text.replace(/^\s*linkStyle\s+default\s+interpolate\s+basis\s*$/gim, "");

  return text.trim();
}

function ensureExtension(name: string, extension: string): string {
  return name.endsWith(extension) ? name : `${name}${extension}`;
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatDate(value?: string): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
