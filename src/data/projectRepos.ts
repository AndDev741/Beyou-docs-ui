import type { RepoConfig } from "@/lib/githubCatalog";
import { parseRepoList } from "@/lib/githubCatalog";

export const defaultProjectOrg = "AndDev741";

export function resolveProjectOrg(envValue?: string): string {
  const trimmed = envValue?.trim();
  return trimmed ? trimmed : defaultProjectOrg;
}

export function resolveProjectRepos(envValue?: string): RepoConfig[] {
  const parsed = parseRepoList(envValue);
  return parsed?.length ? parsed : [];
}
