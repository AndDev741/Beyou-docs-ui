import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Layers,
  Code2,
  Newspaper,
  FolderKanban,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { fetchSearchResults, type SearchResult } from "@/lib/searchApi";

export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("beyou-docs-recent-searches");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const addRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q !== query);
      const updated = [query, ...filtered].slice(0, 5);
      localStorage.setItem("beyou-docs-recent-searches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const categories = useMemo(
    () => [
      { id: "all", label: t("search.categories.all"), icon: Search },
      { id: "architecture", label: t("search.categories.architecture"), icon: Layers },
      { id: "api", label: t("search.categories.apis"), icon: Code2 },
      { id: "blog", label: t("search.categories.blog"), icon: Newspaper },
      { id: "project", label: t("search.categories.projects"), icon: FolderKanban },
    ],
  [t],
  );

  const HighlightedText = ({ fragments }: { fragments: string[] }) => {
    if (!fragments || fragments.length === 0) return null;
    const html = fragments.join('');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const performSearch = useCallback(async (searchQuery: string, category: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSearchResults(
        searchQuery,
        i18n.language, // locale from i18n
        category === "all" ? undefined : category,
        10,
        0
      );
      setResults(data);
      addRecentSearch(searchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [i18n, addRecentSearch]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.trim().length === 0) {
      setResults([]);
      setError(null);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      performSearch(query, selectedCategory);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, selectedCategory, performSearch]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Trigger search immediately when category changes (debounce already handles)
  };

  const getIconForType = (type: SearchResult["type"]) => {
    switch (type) {
      case "architecture":
        return Layers;
      case "api":
        return Code2;
      case "blog":
        return Newspaper;
      case "project":
        return FolderKanban;
      default:
        return Search;
    }
  };

  const getPathForResult = (result: SearchResult) => {
    switch (result.type) {
      case "architecture":
        return `/architecture?topic=${result.key}`;
      case "blog":
        return `/blog?post=${result.key}`;
      case "api":
        return `/apis?controller=${result.key}`;
      case "project":
        return `/projects`;
      default:
        return "/";
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">{t("search.title")}</h1>
            <p className="text-muted-foreground">{t("search.subtitle")}</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="h-14 pl-12 pr-4 text-lg bg-white/5 border-glass-border/30 focus:border-primary/50"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-white/10 rounded text-muted-foreground">
              ⌘K
            </kbd>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? "bg-gradient-to-r from-primary/20 to-accent/20 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {!query ? (
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{t("search.recentTitle")}</span>
              </div>
              <div className="space-y-2">
                {recentSearches.map((searchItem, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(searchItem)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{searchItem}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">{t("search.loading")}</span>
                </div>
              )}

              {error && (
                <div className="glass-panel rounded-xl p-4 border border-destructive/30">
                  <p className="text-destructive text-sm">{t("search.error")}: {error}</p>
                </div>
              )}

              {!isLoading && !error && results.length === 0 && query.trim().length >= 2 && (
                <div className="glass-panel rounded-xl p-8 text-center">
                  <p className="text-muted-foreground">{t("search.noResults")}</p>
                </div>
              )}

              {!isLoading && !error && results.length > 0 && results.map((result, i) => {
                const Icon = getIconForType(result.type);
                const path = getPathForResult(result);
                return (
                  <motion.div
                    key={`${result.type}-${result.key}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-panel rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors gradient-border"
                    onClick={() => window.open(path, "_self")}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-white/5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground mb-1"><HighlightedText fragments={result.highlight.title} /></h3>
                        <p className="text-sm text-muted-foreground"><HighlightedText fragments={result.highlight.summary} /></p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-muted-foreground">
                            {result.type}
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            {result.updatedAt ? new Date(result.updatedAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-1">{path}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
