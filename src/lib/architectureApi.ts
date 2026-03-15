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

export type ArchitectureTopicListItem = {
  key: string;
  title: string;
  summary?: string | null;
  orderIndex: number;
  updatedAt?: string | null;
  status: string;
  tags?: string | null;
  projectKey?: string | null;
};

export type ArchitectureTopicDetail = {
  key: string;
  title: string;
  diagramMermaid: string;
  docMarkdown: string;
  updatedAt?: string | null;
  status: string;
  tags?: string | null;
  projectKey?: string | null;
};

export function estimateReadingTime(markdown: string): number {
  if (!markdown) return 1;
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatRelativeDate(dateStr: string, locale?: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  const isPt = locale?.startsWith("pt");
  if (diffDays === 0) return isPt ? "Hoje" : "Today";
  if (diffDays === 1) return isPt ? "Ontem" : "Yesterday";
  if (diffDays < 30) return isPt ? `${diffDays}d atrás` : `${diffDays}d ago`;
  return date.toLocaleDateString(isPt ? "pt-BR" : "en-US");
}

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

export async function fetchArchitectureTopics(locale?: string): Promise<ArchitectureTopicListItem[]> {
  const url = buildUrl("/docs/architecture/topics", locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}

export async function fetchArchitectureTopicDetail(
  key: string,
  locale?: string,
): Promise<ArchitectureTopicDetail> {
  const url = buildUrl(`/docs/architecture/topics/${encodeURIComponent(key)}`, locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}
