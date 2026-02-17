import { useCallback, useEffect, useRef, useState } from "react";
import type { RepoConfig } from "@/lib/githubCatalog";
import {
  buildDesignMarkdown,
  deleteDesignFile,
  fetchDesigns,
  saveDesignFile,
} from "@/lib/githubDesigns";
import type { Design, DesignCategory, DesignFormData, DesignMeta } from "@/types/design";

const DESIGNS_ROOT = "designs";

export function useDesigns(repo: RepoConfig, token?: string) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const designsRef = useRef(designs);
  useEffect(() => {
    designsRef.current = designs;
  }, [designs]);

  const loadDesigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDesigns(repo, token);
      setDesigns(data);
      setSelectedDesign((prev) => (prev ? data.find((design) => design.id === prev.id) ?? null : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load designs");
    } finally {
      setLoading(false);
    }
  }, [repo, token]);

  useEffect(() => {
    void loadDesigns();
  }, [loadDesigns]);

  const createDesign = useCallback(async (data: DesignFormData): Promise<Design> => {
    if (!token) {
      throw new Error("Read-only mode. Creating designs is disabled.");
    }
    const baseSlug = toSlug(data.title) || "design";
    const slug = ensureUniqueSlug(baseSlug, designsRef.current.map((design) => design.id));
    const path = `${DESIGNS_ROOT}/${slug}.md`;
    const now = new Date();
    const meta: DesignMeta = {
      title: data.title.trim() || slug,
      category: data.category,
      author: "You",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      project: slug,
    };
    const markdown = buildDesignMarkdown(meta, data.content);

    await saveDesignFile(repo, path, markdown, `docs-ui: add design ${slug}`, token);

    const design: Design = {
      id: slug,
      slug,
      path,
      title: meta.title ?? slug,
      category: data.category,
      content: data.content,
      author: meta.author ?? "You",
      createdAt: now,
      updatedAt: now,
      project: meta.project,
    };
    setDesigns((prev) => [design, ...prev]);
    return design;
  }, [repo, token]);

  const updateDesign = useCallback(async (id: string, data: Partial<DesignFormData>): Promise<Design> => {
    if (!token) {
      throw new Error("Read-only mode. Updating designs is disabled.");
    }
    const target = designsRef.current.find((design) => design.id === id);
    if (!target) {
      throw new Error("Design not found.");
    }
    const now = new Date();
    const next: Design = {
      ...target,
      title: data.title ?? target.title,
      category: data.category ?? target.category,
      content: data.content ?? target.content,
      updatedAt: now,
    };
    const meta: DesignMeta = {
      title: next.title,
      category: next.category,
      author: next.author,
      createdAt: target.createdAt.toISOString(),
      updatedAt: now.toISOString(),
      project: next.project,
    };
    const markdown = buildDesignMarkdown(meta, next.content);
    const path = target.path ?? `${DESIGNS_ROOT}/${target.slug ?? target.id}.md`;

    await saveDesignFile(repo, path, markdown, `docs-ui: update design ${id}`, token);

    setDesigns((prev) => prev.map((design) => (design.id === id ? next : design)));
    setSelectedDesign((prev) => (prev?.id === id ? next : prev));
    return next;
  }, [repo, token]);

  const deleteDesign = useCallback(async (id: string): Promise<void> => {
    if (!token) {
      throw new Error("Read-only mode. Deleting designs is disabled.");
    }
    const target = designsRef.current.find((design) => design.id === id);
    if (!target) {
      return;
    }
    const path = target.path ?? `${DESIGNS_ROOT}/${target.slug ?? target.id}.md`;
    await deleteDesignFile(repo, path, `docs-ui: delete design ${id}`, token);
    setDesigns((prev) => prev.filter((design) => design.id !== id));
    setSelectedDesign((prev) => (prev?.id === id ? null : prev));
  }, [repo, token]);

  const getDesignsByCategory = useCallback(
    (category: DesignCategory | "all") => {
      if (category === "all") return designs;
      return designs.filter((design) => design.category === category);
    },
    [designs],
  );

  return {
    designs,
    selectedDesign,
    setSelectedDesign,
    createDesign,
    updateDesign,
    deleteDesign,
    getDesignsByCategory,
    loading,
    error,
    reload: loadDesigns,
  };
}

function ensureUniqueSlug(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let idx = 2;
  while (existing.includes(`${base}-${idx}`)) {
    idx += 1;
  }
  return `${base}-${idx}`;
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
