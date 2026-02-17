import type { RepoConfig } from "@/lib/githubCatalog";

export const DEFAULT_API_ORG = "AndDev741";
const API_REPO_PREFIX = "gentl-";
const API_REPO_SUFFIX = "-api";

export function resolveApiOrg(envValue?: string): string {
  const trimmed = envValue?.trim();
  return trimmed ? trimmed : DEFAULT_API_ORG;
}

export function isGentlApiRepoName(repoName: string): boolean {
  const normalized = repoName.trim().toLowerCase();
  return normalized.startsWith(API_REPO_PREFIX) && normalized.endsWith(API_REPO_SUFFIX);
}

export function formatApiRepoLabel(repoName: string): string {
  const segments = repoName.split("-").filter(Boolean);
  if (!segments.length) return repoName;

  return segments
    .map((segment) => {
      const lower = segment.toLowerCase();
      if (lower === "gentl") return "GentL";
      if (lower === "api") return "API";
      if (/^[a-z]{1,3}$/.test(lower)) return lower.toUpperCase();
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

export function toApiRepoConfig(repo: RepoConfig, defaultBranch?: string | null): RepoConfig {
  return {
    ...repo,
    ref: defaultBranch ?? repo.ref,
    label: repo.label ?? formatApiRepoLabel(repo.repo),
  };
}
