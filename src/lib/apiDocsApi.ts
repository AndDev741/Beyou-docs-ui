import { getApiBaseUrl } from "./apiBase";

const resolveLocale = (locale?: string): string | undefined => {
  if (!locale) return undefined;
  const normalized = locale.toLowerCase();
  return normalized.startsWith("pt") ? "pt" : "en";
};

export type ApiControllerListItem = {
  key: string;
  title: string;
  summary: string;
  orderIndex: number;
  updatedAt?: string | null;
};

export type ApiControllerDetail = {
  key: string;
  title: string;
  summary: string;
  apiCatalog: string;
  updatedAt?: string | null;
};

const buildUrl = (path: string, locale?: string): string => {
  const base = getApiBaseUrl();
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

export async function fetchApiControllers(locale?: string): Promise<ApiControllerListItem[]> {
  const url = buildUrl("/docs/api/controllers", locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}

export async function fetchApiControllerDetail(
  key: string,
  locale?: string,
): Promise<ApiControllerDetail> {
  const url = buildUrl(`/docs/api/controllers/${encodeURIComponent(key)}`, locale);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return response.json();
}