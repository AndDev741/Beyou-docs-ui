import { motion } from "framer-motion";
import { FileText, Workflow, Layers, Calendar, User } from "lucide-react";
import { Design, DesignCategory } from "@/types/design";
import { cn } from "@/lib/utils";

interface DesignCardProps {
  design: Design;
  isSelected?: boolean;
  onClick: () => void;
}

const categoryIcons: Record<DesignCategory, React.ReactNode> = {
  flows: <Workflow className="w-5 h-5" />,
  wireframes: <Layers className="w-5 h-5" />,
  specs: <FileText className="w-5 h-5" />,
};

const categoryColors: Record<DesignCategory, string> = {
  flows: "from-purple-500/20 to-pink-500/20 text-purple-400",
  wireframes: "from-blue-500/20 to-cyan-500/20 text-blue-400",
  specs: "from-emerald-500/20 to-teal-500/20 text-emerald-400",
};

const categoryLabels: Record<DesignCategory, string> = {
  flows: "User Flow",
  wireframes: "Wireframe",
  specs: "Technical Spec",
};

export function DesignCard({ design, isSelected, onClick }: DesignCardProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "glass-panel p-4 rounded-xl cursor-pointer transition-all gradient-border",
        isSelected && "ring-2 ring-primary",
      )}
    >
      {/* Category Badge */}
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r mb-3",
          categoryColors[design.category],
        )}
      >
        {categoryIcons[design.category]}
        {categoryLabels[design.category]}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
        {design.title}
      </h3>

      {/* Preview */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {design.content.replace(/```[\s\S]*?```/g, "[diagram]").replace(/#/g, "").substring(0, 100)}...
      </p>

      {/* Meta */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {design.author}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(design.updatedAt)}
          </div>
        </div>
        {design.project && (
          <div className="text-[10px] text-muted-foreground/80">Project: {design.project}</div>
        )}
      </div>
    </motion.div>
  );
}
