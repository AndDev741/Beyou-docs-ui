import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Grid3X3, List } from "lucide-react";
import { Design, DesignCategory } from "@/types/design";
import { DesignCard } from "./DesignCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DesignListProps {
  designs: Design[];
  selectedDesign: Design | null;
  onSelect: (design: Design) => void;
  loading?: boolean;
  error?: string | null;
}

const categories = [
  { id: "all" as const, label: "all", count: 0 },
  { id: "flows" as const, label: "flows", count: 0 },
  { id: "wireframes" as const, label: "wireframes", count: 0 },
  { id: "specs" as const, label: "specs", count: 0 },
];

export function DesignList({
  designs,
  selectedDesign,
  onSelect,
  loading = false,
  error = null,
}: DesignListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DesignCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { t } = useTranslation();

  // Calculate counts
  const categoriesWithCounts = categories.map((cat) => ({
    ...cat,
    count: cat.id === "all"
      ? designs.length
      : designs.filter((d) => d.category === cat.id).length,
  }));

  // Filter designs
  const filteredDesigns = designs.filter((design) => {
    const matchesCategory = selectedCategory === "all" || design.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch = design.title.toLowerCase().includes(query)
      || design.content.toLowerCase().includes(query)
      || (design.project ?? "").toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t("design.list.title")}</h2>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("design.list.search")}
            className="pl-9 bg-muted/50 border-border/50"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {categoriesWithCounts.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                selectedCategory === cat.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {t(`design.list.category.${cat.label}`)}
              <span className="ml-1.5 opacity-60">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-border/30">
        <span className="text-xs text-muted-foreground">
          {t("design.list.count", { count: filteredDesigns.length })}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", viewMode === "grid" && "bg-muted")}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", viewMode === "list" && "bg-muted")}
            onClick={() => setViewMode("list")}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Design List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-sm text-muted-foreground">{t("design.list.loading")}</div>
        )}
        {error && (
          <div className="text-sm text-red-200">{error}</div>
        )}
        {!loading && !error && (
          <AnimatePresence mode="popLayout">
            {filteredDesigns.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-48 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{t("design.list.empty")}</p>
              </motion.div>
            ) : (
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 gap-3"
                    : "flex flex-col gap-2",
                )}
              >
                {filteredDesigns.map((design, index) => (
                  <motion.div
                    key={design.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <DesignCard
                      design={design}
                      isSelected={selectedDesign?.id === design.id}
                      onClick={() => onSelect(design)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
