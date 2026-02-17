export type RepoConfig = {
  id?: string;
  owner: string;
  repo: string;
  label?: string;
  ref?: string;
  basePath?: string;
  specFile?: string;
};

export type ApiPathEntry = {
  path: string;
  ref?: string;
  sourcePath?: string;
  methods?: string[];
};

export type ApiSchemaEntry = {
  name: string;
  ref?: string;
  sourcePath?: string;
};

export type ApiSpecInfo = {
  title?: string;
  version?: string;
  description?: string;
  servers?: string[];
};

export type ApiCatalog = {
  repo: RepoConfig;
  specFile?: string;
  info?: ApiSpecInfo;
  paths: ApiPathEntry[];
  schemas: ApiSchemaEntry[];
  warnings: string[];
  error?: string;
};

export type FetchAllApiCatalogsOptions = {
  concurrency?: number;
  onProgress?: (catalog: ApiCatalog, index: number, total: number) => void;
};

export type ApiParameter = {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  type?: string;
  ref?: string;
};

export type ApiSchemaPointer = {
  ref?: string;
  name?: string;
  inline?: unknown;
};

export type ApiRequestBody = {
  description?: string;
  required?: boolean;
  contentType?: string;
  schema?: ApiSchemaPointer;
};

export type ApiResponse = {
  status: string;
  description?: string;
  contentType?: string;
  schema?: ApiSchemaPointer;
};

export type ApiOperation = {
  method: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
};

export type ApiPathDetail = {
  path: string;
  sourcePath?: string;
  operations: ApiOperation[];
};

export type ApiSchemaProperty = {
  name: string;
  type?: string;
  format?: string;
  description?: string;
  required?: boolean;
  ref?: string;
  itemsType?: string;
  enum?: string[];
  nullable?: boolean;
};

export type ApiSchemaDetail = {
  name: string;
  sourcePath?: string;
  description?: string;
  type?: string;
  required?: string[];
  properties: ApiSchemaProperty[];
  composedOf: ApiSchemaPointer[];
  raw?: unknown;
};

export function parseRepoList(value?: string): RepoConfig[] | null {
  const raw = value?.trim();
  if (!raw) return null;
  const entries = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!entries.length) return null;

  const repos = entries
    .map((entry) => {
      const [repoPart, ref] = entry.split("#");
      const [owner, repo] = repoPart.split("/").map((segment) => segment.trim());
      if (!owner || !repo) return null;
      const id = `${owner}/${repo}`;
      return {
        id,
        owner,
        repo,
        ref: ref?.trim() || undefined,
      } satisfies RepoConfig;
    })
    .filter((repo): repo is RepoConfig => Boolean(repo));

  return repos.length ? repos : null;
}

export async function fetchApiCatalog(repo: RepoConfig): Promise<ApiCatalog> {
  return {
    repo,
    specFile: repo.specFile,
    info: {
      title: repo.label ?? repo.repo,
      version: "0.0.0",
      description: "API catalog will be loaded from the database.",
    },
    paths: [],
    schemas: [],
    warnings: [],
  };
}

export async function fetchAllApiCatalogs(
  repos: RepoConfig[],
  _token?: string,
  options: FetchAllApiCatalogsOptions = {},
): Promise<ApiCatalog[]> {
  const catalogs = await Promise.all(repos.map((repo) => fetchApiCatalog(repo)));
  catalogs.forEach((catalog, index) => options.onProgress?.(catalog, index, catalogs.length));
  return catalogs;
}

export async function fetchPathDetail(
  _repo: RepoConfig,
  path: ApiPathEntry,
): Promise<ApiPathDetail> {
  return {
    path: path.path,
    sourcePath: path.sourcePath,
    operations: [],
  };
}

export async function fetchSchemaDetail(
  _repo: RepoConfig,
  schema: ApiSchemaEntry,
): Promise<ApiSchemaDetail> {
  return {
    name: schema.name,
    sourcePath: schema.sourcePath,
    properties: [],
    composedOf: [],
  };
}

export async function fetchSchemaDetailByPath(
  _repo: RepoConfig,
  ref: string,
): Promise<ApiSchemaDetail> {
  return {
    name: ref.split("/").pop() ?? ref,
    sourcePath: ref,
    properties: [],
    composedOf: [],
  };
}

export function resolveRefPath(ref: string, basePath: string): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith("#/")) return ref;
  if (/^https?:\/\//.test(ref)) return ref;
  if (ref.startsWith("/")) return ref;
  if (!basePath) return ref;
  const trimmed = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return `${trimmed}/${ref}`;
}
