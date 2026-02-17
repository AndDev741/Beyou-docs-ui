import type { RepoConfig } from "@/lib/githubCatalog";

export type ProjectInfo = {
  repo: RepoConfig;
  name: string;
  fullName: string;
  description?: string;
  htmlUrl: string;
  owner: {
    login: string;
    avatarUrl?: string;
    htmlUrl?: string;
    type?: string;
  };
  language?: string;
  defaultBranch?: string;
  visibility?: string;
  archived?: boolean;
  disabled?: boolean;
  private?: boolean;
  fork?: boolean;
  stars?: number;
  forks?: number;
  openIssues?: number;
  watchers?: number;
  commits?: number;
  branches?: number;
  tags?: number;
  size?: number;
  updatedAt?: string;
  pushedAt?: string;
  createdAt?: string;
  license?: string;
  topics?: string[];
};

export type ProjectEntry = {
  repo: RepoConfig;
  info?: ProjectInfo;
  error?: string;
};

export type OrgProjectsSummary = {
  totalCount?: number;
  apiCount?: number;
  repos: ProjectInfo[];
  sampled: boolean;
};

export type FetchProjectsByReposOptions = {
  concurrency?: number;
  onProgress?: (entry: ProjectEntry, index: number, total: number) => void;
};

export type FetchOrgProjectsOptions = {
  onProgress?: (entries: ProjectEntry[], page: number, totalFetched: number) => void;
};

const NOW = new Date().toISOString();

const LOCAL_PROJECTS: ProjectInfo[] = [
  {
    repo: { id: "AndDev741/Beyou-backend-spring", owner: "AndDev741", repo: "Beyou-backend-spring", label: "Backend" },
    name: "Beyou Backend",
    fullName: "AndDev741/Beyou-backend-spring",
    description: "Spring Boot backend for Beyou habits.",
    htmlUrl: "https://github.com/AndDev741/Beyou-backend-spring",
    owner: { login: "AndDev741", htmlUrl: "https://github.com/AndDev741", type: "User" },
    language: "Java",
    defaultBranch: "main",
    visibility: "public",
    commits: 0,
    branches: 0,
    tags: 0,
    topics: ["spring", "backend", "beyou"],
    updatedAt: NOW,
    pushedAt: NOW,
    createdAt: NOW,
  },
  {
    repo: { id: "AndDev741/Beyou-Frontend", owner: "AndDev741", repo: "Beyou-Frontend", label: "Frontend" },
    name: "Beyou Frontend",
    fullName: "AndDev741/Beyou-Frontend",
    description: "React UI for Beyou habit tracking.",
    htmlUrl: "https://github.com/AndDev741/Beyou-Frontend",
    owner: { login: "AndDev741", htmlUrl: "https://github.com/AndDev741", type: "User" },
    language: "TypeScript",
    defaultBranch: "main",
    visibility: "public",
    commits: 0,
    branches: 0,
    tags: 0,
    topics: ["react", "frontend", "beyou"],
    updatedAt: NOW,
    pushedAt: NOW,
    createdAt: NOW,
  },
  {
    repo: { id: "AndDev741/Beyou-dev-env", owner: "AndDev741", repo: "Beyou-dev-env", label: "Dev Orchestrator" },
    name: "Beyou Dev Env",
    fullName: "AndDev741/Beyou-dev-env",
    description: "Local development orchestration for Beyou.",
    htmlUrl: "https://github.com/AndDev741/Beyou-dev-env",
    owner: { login: "AndDev741", htmlUrl: "https://github.com/AndDev741", type: "User" },
    language: "Shell",
    defaultBranch: "main",
    visibility: "public",
    commits: 0,
    branches: 0,
    tags: 0,
    topics: ["devops", "docker", "beyou"],
    updatedAt: NOW,
    pushedAt: NOW,
    createdAt: NOW,
  },
];

function toEntry(info: ProjectInfo): ProjectEntry {
  return { repo: info.repo, info };
}

function matchRepo(repo: RepoConfig): ProjectInfo | undefined {
  const id = repo.id ?? `${repo.owner}/${repo.repo}`;
  return LOCAL_PROJECTS.find((project) => (project.repo.id ?? project.fullName) === id);
}

export async function fetchProjectsByRepos(
  repos: RepoConfig[],
  _token?: string,
  options: FetchProjectsByReposOptions = {},
): Promise<ProjectEntry[]> {
  const entries = repos.map((repo) => {
    const info = matchRepo(repo);
    return info ? toEntry(info) : { repo, error: "Project not available in local snapshot." };
  });
  entries.forEach((entry, index) => options.onProgress?.(entry, index, entries.length));
  return entries;
}

export async function fetchOrgProjects(
  org: string,
  _token?: string,
  options: FetchOrgProjectsOptions = {},
): Promise<ProjectEntry[]> {
  const normalized = org.trim().toLowerCase();
  const filtered = LOCAL_PROJECTS.filter((project) => project.owner.login.toLowerCase() === normalized);
  const entries = filtered.map(toEntry);
  if (entries.length) {
    options.onProgress?.(entries, 1, entries.length);
  }
  return entries;
}

export async function fetchOrgProjectsSummary(
  org: string,
  _token?: string,
  _limit = 12,
): Promise<OrgProjectsSummary> {
  const entries = await fetchOrgProjects(org);
  const repos = entries.map((entry) => entry.info).filter((info): info is ProjectInfo => Boolean(info));
  return {
    totalCount: repos.length,
    apiCount: 0,
    repos,
    sampled: false,
  };
}

export async function fetchProjectDetail(repo: RepoConfig, _token?: string): Promise<ProjectInfo> {
  const info = matchRepo(repo);
  if (!info) {
    return {
      repo,
      name: repo.repo,
      fullName: repo.id ?? `${repo.owner}/${repo.repo}`,
      description: "Local snapshot unavailable.",
      htmlUrl: `https://github.com/${repo.owner}/${repo.repo}`,
      owner: { login: repo.owner },
    };
  }
  return info;
}

export async function fetchAllProjectDetails(
  repos: RepoConfig[],
  _token?: string,
  options: FetchProjectsByReposOptions = {},
): Promise<ProjectEntry[]> {
  return fetchProjectsByRepos(repos, undefined, options);
}
