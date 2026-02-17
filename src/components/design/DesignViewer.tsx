import { motion } from "framer-motion";
import { Calendar, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Design } from "@/types/design";
import { DesignMarkdown } from "./DesignMarkdown";

interface DesignViewerProps {
  design: Design;
}

export function DesignViewer({ design }: DesignViewerProps) {
  const { t } = useTranslation();
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {design.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {design.author}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {t("design.viewer.updated", { date: formatDate(design.updatedAt) })}
              </div>
              {design.project && (
                <div className="text-xs text-muted-foreground">
                  {t("design.viewer.project", { project: design.project })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <DesignMarkdown content={design.content} />
        </div>
      </div>
    </motion.div>
  );
}
