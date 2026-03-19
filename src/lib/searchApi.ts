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

export type SearchResult = {
  type: "architecture" | "blog" | "api" | "project";
  key: string;
  title: string;
  summary: string | null;
  updatedAt: string | null;
  score: number;
  highlight: {
    title: string[];
    summary: string[];
  };
};

export async function fetchSearchResults(
  q: string,
  locale?: string,
  category?: string,
  limit?: number,
  offset?: number
): Promise<SearchResult[]> {
  const base = getBaseUrl();
  const url = new URL(`${base}/docs/search`);

  url.searchParams.set("q", q);
  const resolvedLocale = resolveLocale(locale);
  if (resolvedLocale) {
    url.searchParams.set("locale", resolvedLocale);
  }
  if (category && category !== "all") {
    url.searchParams.set("category", category);
  }
  if (limit !== undefined) {
    url.searchParams.set("limit", limit.toString());
  }
  if (offset !== undefined) {
    url.searchParams.set("offset", offset.toString());
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}