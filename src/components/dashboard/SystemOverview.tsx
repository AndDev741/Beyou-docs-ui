import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MermaidBlock } from "@/components/design/MermaidBlock";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type SystemStat = {
  icon: LucideIcon;
  label: string;
  value: string;
  subtext?: string;
  status?: "healthy" | "warning" | "error";
};

export type ArchitecturePreview = {
  title: string;
  code: string;
  href?: string;
};

interface SystemOverviewProps {
  stats?: SystemStat[];
  preview?: ArchitecturePreview | null;
  loading?: boolean;
  error?: string | null;
}

export function SystemOverview({
  stats = [],
  preview = null,
  loading = false,
  error = null,
}: SystemOverviewProps) {
  const { t } = useTranslation();
  return (
    <section className="px-4 md:px-8 py-10 md:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">
            {t("home.overview.title")}
          </h2>
        </div>

        {loading && (
          <div className="glass-panel rounded-xl p-6 text-sm text-muted-foreground">
            {t("home.overview.loading")}
          </div>
        )}
        {!loading && error && (
          <div className="glass-panel rounded-xl p-6 text-sm text-red-200">
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-panel rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-white/5">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  {stat.status && (
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stat.status === "healthy"
                          ? "status-healthy"
                          : stat.status === "warning"
                          ? "status-warning"
                          : "status-error"
                      }`}
                    >
                      {stat.status === "healthy"
                        ? t("home.overview.status.healthy")
                        : stat.status === "warning"
                        ? t("home.overview.status.warning")
                        : t("home.overview.status.error")}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {stat.label}
                  </p>
                  {stat.subtext && (
                    <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mini Architecture Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 glass-panel rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {t("home.overview.previewTitle")}
            </h3>
            <Link
              to="/architecture"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              {t("home.overview.previewLink")}
            </Link>
          </div>
          {preview?.title && (
            <p className="text-xs text-muted-foreground mb-3">{preview.title}</p>
          )}
          <div className="h-56 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-glass-border/30 flex items-center justify-center">
            {preview?.code ? (
              <div className="w-full h-full p-2">
                <MermaidBlock code={preview.code} className="h-full" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t("home.overview.previewEmpty")}</div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
