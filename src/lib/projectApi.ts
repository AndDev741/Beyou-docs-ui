const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
  const defaultBase =
    import.meta.env.DEV || typeof window === "undefined"
      ? "http://localhost:8099"
      : window.location.origin;
  const base = envUrl && envUrl.trim().length ? envUrl.trim() : defaultBase;
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const resolveLocale = (locale?: string): string | undefined => {
  if (!locale) return undefined;
  const normalized = locale.toLowerCase();
  return normalized.startsWith("pt") ? "pt" : "en";
};

export type ProjectTopicListItem = {
  key: string;
  title: string;
  summary: string;
  orderIndex: number;
  updatedAt: string;
  status: string;
  tags: string; // JSON string
};

export type ProjectTopicDetail = {
  key: string;
  title: string;
  docMarkdown: string;
  diagramMermaid: string;
  designTopicKey: string | null;
  architectureTopicKey: string | null;
  repositoryUrl: string | null;
  tags: string; // JSON string
  updatedAt: string;
};

const buildUrl = (path: string, locale?: string): string => {
  const base = getBaseUrl();
  const url = new URL(`${base}${path}`);
  const resolvedLocale = resolveLocale(locale);
  if (resolvedLocale) {
    url.searchParams.set("locale", resolvedLocale);
  }
  return url.toString();
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    if (!text) return response.statusText;
    try {
      const payload = JSON.parse(text) as { message?: string; error?: string };
      return payload.message || payload.error || text;
    } catch {
      return text;
    }
  } catch {
    return response.statusText;
  }
};

export async function fetchProjectTopics(locale?: string): Promise<ProjectTopicListItem[]> {
  const url = buildUrl("/docs/projects/topics", locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}

export async function fetchProjectTopicDetail(
  key: string,
  locale?: string,
): Promise<ProjectTopicDetail> {
  const url = buildUrl(`/docs/projects/topics/${encodeURIComponent(key)}`, locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}

/**
 * Parse tags JSON string into an array of strings.
 * Returns empty array if parsing fails or tags is empty.
 */
export function parseTags(tagsJson: string): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    return [];
  } catch {
    return [];
  }
}