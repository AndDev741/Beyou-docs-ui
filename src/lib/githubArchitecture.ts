import type { RepoConfig } from "@/lib/githubCatalog";

export type ArchitectureTopic = {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  linkedProjects: string[];
  updatedAt?: string;
  sourcePath: string;
};

export type TopicFile = {
  name: string;
  path: string;
  type: "diagram" | "doc";
  format?: "mermaid" | "builder";
};

export type TopicAssets = {
  diagrams: TopicFile[];
  docs: TopicFile[];
};

export type TopicIndexInput = {
  title: string;
  description?: string;
  tags?: string[];
  linkedProjects?: string[];
  updatedAt?: string;
};

const NOW = new Date().toISOString();

const LOCAL_TOPICS: ArchitectureTopic[] = [
  {
    slug: "system-overview",
    title: "System Overview",
    description: "Beyou docs flow: UI -> backend -> database, with repo versioning.",
    tags: ["backend", "frontend", "infra"],
    linkedProjects: [
      "AndDev741/Beyou-backend-spring",
      "AndDev741/Beyou-Frontend",
      "AndDev741/Beyou-dev-env",
    ],
    updatedAt: NOW,
    sourcePath: "topics/system-overview",
  },
];

const LOCAL_ASSETS: Record<string, TopicAssets> = {
  "system-overview": {
    diagrams: [
      {
        name: "overview",
        path: "topics/system-overview/diagrams/overview.mmd",
        type: "diagram",
        format: "mermaid",
      },
    ],
    docs: [
      {
        name: "readme",
        path: "topics/system-overview/docs/readme.md",
        type: "doc",
      },
    ],
  },
};

const LOCAL_FILES: Record<string, string> = {
  "topics/system-overview/diagrams/overview.mmd": `flowchart LR
  UI[UI \n Docs Viewer] -->|GET docs| API[Beyou Backend]
  API -->|read/write| DB[(Database)]
  API -->|sync version| Repo[Docs Repo]
  API --> Cache[(Cache)]
  Cache --> API
  `,
  "topics/system-overview/docs/readme.md": `# System Overview\n\nBeyou Docs loads architecture, designs, APIs, and projects from the backend.\n\n- UI calls the Beyou backend API for docs.\n- Backend persists data in the database.\n- Repo is used for versioning and audit history.\n- Cache keeps reads fast.\n`,
};

export async function fetchArchitectureTopics(
  _repo: RepoConfig,
  _token?: string,
): Promise<ArchitectureTopic[]> {
  return [...LOCAL_TOPICS];
}

export async function fetchTopicAssets(
  _repo: RepoConfig,
  topicSlug: string,
  _token?: string,
): Promise<TopicAssets> {
  return LOCAL_ASSETS[topicSlug] ?? { diagrams: [], docs: [] };
}

export async function fetchTopicFile(
  _repo: RepoConfig,
  path: string,
  _token?: string,
): Promise<string> {
  return LOCAL_FILES[path] ?? "";
}

export async function saveArchitectureFile(
  _repo: RepoConfig,
  _path: string,
  _content: string,
  _message: string,
  _token?: string,
): Promise<void> {
  throw new Error("Read-only mode. Saving is disabled.");
}

export async function deleteArchitectureFile(
  _repo: RepoConfig,
  _path: string,
  _message: string,
  _token?: string,
): Promise<void> {
  throw new Error("Read-only mode. Deleting is disabled.");
}

export function buildTopicIndexYaml(input: TopicIndexInput): string {
  const lines: string[] = [];
  lines.push(`title: ${input.title}`);
  if (input.description) lines.push(`description: ${input.description}`);
  if (input.tags?.length) {
    lines.push("tags:");
    input.tags.forEach((tag) => lines.push(`  - ${tag}`));
  }
  if (input.linkedProjects?.length) {
    lines.push("linkedProjects:");
    input.linkedProjects.forEach((project) => lines.push(`  - ${project}`));
  }
  if (input.updatedAt) lines.push(`updatedAt: ${input.updatedAt}`);
  return `${lines.join("\n")}\n`;
}
