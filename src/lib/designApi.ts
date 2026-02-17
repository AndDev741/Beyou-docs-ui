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

export type DesignTopicListItem = {
  key: string;
  title: string;
  summary?: string | null;
  orderIndex: number;
  updatedAt?: string | null;
};

export type DesignTopicDetail = {
  key: string;
  title: string;
  docMarkdown: string;
  updatedAt?: string | null;
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

export async function fetchDesignTopics(locale?: string): Promise<DesignTopicListItem[]> {
  const url = buildUrl("/docs/design/topics", locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}

export async function fetchDesignTopicDetail(
  key: string,
  locale?: string,
): Promise<DesignTopicDetail> {
  const url = buildUrl(`/docs/design/topics/${encodeURIComponent(key)}`, locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}
