import { motion } from "framer-motion";
import { Clock, GitBranch, FileCode, Box, Palette } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type ActivityItem = {
  type: "project" | "api" | "architecture" | "design";
  title: string;
  description: string;
  time: string;
  href?: string;
};

interface RecentActivityProps {
  items?: ActivityItem[];
  loading?: boolean;
  error?: string | null;
}

const typeConfig: Record<ActivityItem["type"], { icon: typeof Box; color: string }> = {
  project: { icon: Box, color: "text-primary" },
  api: { icon: FileCode, color: "text-primary" },
  architecture: { icon: GitBranch, color: "text-emerald-400" },
  design: { icon: Palette, color: "text-accent" },
};

export function RecentActivity({ items = [], loading = false, error = null }: RecentActivityProps) {
  const { t } = useTranslation();
  return (
    <section className="px-4 md:px-8 py-10 md:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-foreground">
            {t("home.activity.title")}
          </h2>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {t("home.activity.viewAll")}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          {loading && (
            <div className="p-6 text-sm text-muted-foreground">{t("home.activity.loading")}</div>
          )}
          {!loading && error && (
            <div className="p-6 text-sm text-red-200">{error}</div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">{t("home.activity.empty")}</div>
          )}
          {!loading && !error && items.map((item, index) => {
            const config = typeConfig[item.type];
            const row = (
              <motion.div
                key={`${item.type}-${item.title}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 border-b border-glass-border/30 last:border-0 hover:bg-white/5 transition-colors"
              >
                <div className={cn("p-2 rounded-lg bg-white/5", config.color)}>
                  <config.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.time}
                </span>
              </motion.div>
            );

            if (item.href) {
              return (
                <Link key={`${item.type}-${item.title}-${index}`} to={item.href} className="block">
                  {row}
                </Link>
              );
            }
            return row;
          })}
        </motion.div>
      </div>
    </section>
  );
}
