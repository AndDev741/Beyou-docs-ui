import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Layers,
  Code2,
  FileText,
  FolderKanban,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";

export default function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const recentSearches = useMemo(
    () => [
      t("search.recent.1"),
      t("search.recent.2"),
      t("search.recent.3"),
      t("search.recent.4"),
    ],
    [t],
  );

  const categories = useMemo(
    () => [
      { id: "all", label: t("search.categories.all"), icon: Search },
      { id: "architecture", label: t("search.categories.architecture"), icon: Layers },
      { id: "apis", label: t("search.categories.apis"), icon: Code2 },
      { id: "designs", label: t("search.categories.designs"), icon: FileText },
      { id: "projects", label: t("search.categories.projects"), icon: FolderKanban },
    ],
    [t],
  );

  const sampleResults = useMemo(
    () => [
      {
        type: "architecture",
        title: t("search.sample.arch.title"),
        description: t("search.sample.arch.description"),
        path: "/architecture/backend",
      },
      {
        type: "api",
        title: t("search.sample.api.title"),
        description: t("search.sample.api.description"),
        path: "/apis/auth/login",
      },
      {
        type: "design",
        title: t("search.sample.design.title"),
        description: t("search.sample.design.description"),
        path: "/design/auth-flow",
      },
      {
        type: "project",
        title: t("search.sample.project.title"),
        description: t("search.sample.project.description"),
        path: "/projects/core-platform",
      },
    ],
    [t],
  );

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

          <div className="flex justify-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
              {sampleResults.map((result, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors gradient-border"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-white/5">
                      {result.type === "architecture" && (
                        <Layers className="w-4 h-4 text-primary" />
                      )}
                      {result.type === "api" && (
                        <Code2 className="w-4 h-4 text-primary" />
                      )}
                      {result.type === "design" && (
                        <FileText className="w-4 h-4 text-accent" />
                      )}
                      {result.type === "project" && (
                        <FolderKanban className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground mb-1">{result.title}</h3>
                      <p className="text-sm text-muted-foreground">{result.description}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">{result.path}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
