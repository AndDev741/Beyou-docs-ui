import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EmptyDesignStateProps {
  title: string;
  description: string;
}

export function EmptyDesignState({ title, description }: EmptyDesignStateProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center text-center p-8"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <FileText className="w-10 h-10 text-primary" />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>

      <div className="mt-6 grid grid-cols-3 gap-6 text-center">
        {[
          { label: t("design.empty.cards.flows.title"), desc: t("design.empty.cards.flows.body") },
          { label: t("design.empty.cards.wireframes.title"), desc: t("design.empty.cards.wireframes.body") },
          { label: t("design.empty.cards.specs.title"), desc: t("design.empty.cards.specs.body") },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="p-4 rounded-xl bg-muted/30 border border-border/30"
          >
            <p className="text-sm font-medium text-foreground mb-1">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
