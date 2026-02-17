import type { RepoConfig } from "@/lib/githubCatalog";
import type { Design, DesignMeta } from "@/types/design";

const NOW = new Date();

const LOCAL_DESIGNS: Design[] = [
  {
    id: "habit-loop",
    slug: "habit-loop",
    path: "designs/habit-loop.md",
    title: "Habit Loop",
    category: "flows",
    content: "## Habit Loop\n\nMap the trigger, routine, and reward that Beyou reinforces.",
    author: "Beyou",
    createdAt: NOW,
    updatedAt: NOW,
    project: "Beyou-Frontend",
  },
];

export async function fetchDesigns(_repo: RepoConfig, _token?: string): Promise<Design[]> {
  return [...LOCAL_DESIGNS];
}

export async function fetchDesignFile(
  _repo: RepoConfig,
  _path: string,
  _token?: string,
): Promise<string> {
  return "";
}

export async function saveDesignFile(
  _repo: RepoConfig,
  _path: string,
  _content: string,
  _message: string,
  _token?: string,
): Promise<void> {
  throw new Error("Read-only mode. Saving is disabled.");
}

export async function deleteDesignFile(
  _repo: RepoConfig,
  _path: string,
  _message: string,
  _token?: string,
): Promise<void> {
  throw new Error("Read-only mode. Deleting is disabled.");
}

export function buildDesignMarkdown(meta: DesignMeta, content: string): string {
  const lines = [
    "---",
    `title: ${meta.title ?? ""}`,
    `category: ${meta.category ?? ""}`,
    `author: ${meta.author ?? ""}`,
    `createdAt: ${meta.createdAt ?? ""}`,
    `updatedAt: ${meta.updatedAt ?? ""}`,
    meta.project ? `project: ${meta.project}` : "",
    "---",
    "",
    content,
  ].filter(Boolean);
  return lines.join("\n");
}

export type ParsedDesign = {
  meta: DesignMeta;
  content: string;
};

export function parseDesignMarkdown(raw: string): ParsedDesign {
  return {
    meta: {
      title: "",
      category: "flows",
      author: "",
      createdAt: "",
      updatedAt: "",
    },
    content: raw,
  };
}
