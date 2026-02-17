import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Layers,
  Palette,
  Code2,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const cards = [
  {
    icon: Layers,
    titleKey: "home.quick.arch.title",
    descriptionKey: "home.quick.arch.description",
    path: "/architecture",
    gradient: "from-primary to-accent",
  },
  {
    icon: Palette,
    titleKey: "home.quick.design.title",
    descriptionKey: "home.quick.design.description",
    path: "/design",
    gradient: "from-accent to-primary",
  },
  {
    icon: Code2,
    titleKey: "home.quick.apis.title",
    descriptionKey: "home.quick.apis.description",
    path: "/apis",
    gradient: "from-primary to-accent",
  },
  {
    icon: FolderKanban,
    titleKey: "home.quick.projects.title",
    descriptionKey: "home.quick.projects.description",
    path: "/projects",
    gradient: "from-accent to-primary",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function QuickAccessCards() {
  const { t } = useTranslation();
  return (
    <section className="px-4 md:px-8 py-10 md:py-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold mb-8 text-foreground">
          {t("home.quick.title")}
        </h2>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {cards.map((card) => (
            <motion.div key={card.path} variants={item}>
              <Link to={card.path}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative h-full p-6 rounded-xl glass-panel gradient-border cursor-pointer transition-all duration-300"
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br",
                      card.gradient
                    )}
                  >
                    <card.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Badge */}
                  {card.badge && (
                    <span className="absolute top-4 right-4 px-2 py-1 text-xs font-medium bg-gradient-to-r from-primary to-accent text-white rounded-full">
                      {card.badgeKey ? t(card.badgeKey) : card.badge}
                    </span>
                  )}

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {t(card.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(card.descriptionKey)}
                  </p>

                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
