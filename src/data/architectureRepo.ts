import type { RepoConfig } from "@/lib/githubCatalog";

const DEFAULT_OWNER = "gentekai";
const DEFAULT_REPO = "gentl-architecture-ui";

export function resolveArchitectureRepo(repoName?: string): RepoConfig {
  const repo = repoName?.trim() || DEFAULT_REPO;
  return {
    id: `${DEFAULT_OWNER}/${repo}`,
    owner: DEFAULT_OWNER,
    repo,
    label: "Architecture",
  };
}
