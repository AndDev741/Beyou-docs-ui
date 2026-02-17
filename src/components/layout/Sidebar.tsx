import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  BookOpen,
  Layers,
  Palette,
  Code2,
  FolderKanban,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: BookOpen, label: "Getting Started", path: "/getting-started" },
  { icon: Layers, label: "Architecture", path: "/architecture" },
  { icon: Palette, label: "Design", path: "/design" },
  { icon: Code2, label: "APIs", path: "/apis" },
  { icon: FolderKanban, label: "Projects", path: "/projects" },
];

const bottomItems = [
  { icon: Search, label: "Search", path: "/search" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onClose?: () => void;
}

export function Sidebar({ variant = "desktop", onClose }: SidebarProps) {
  const isMobile = variant === "mobile";
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const shouldCollapse = isMobile ? false : collapsed;
  const sidebarWidth = shouldCollapse ? 72 : 260;
  const sidebarClass = useMemo(
    () =>
      cn(
        "flex flex-col glass-panel border-glass-border/30 z-40",
        isMobile
          ? "fixed left-0 top-0 h-full w-72 max-w-[82vw] border-r"
          : "h-screen sticky top-0 border-r",
      ),
    [isMobile],
  );

  return (
    <motion.aside
      initial={isMobile ? { x: -320, opacity: 0 } : false}
      animate={isMobile ? { x: 0, opacity: 1 } : { width: sidebarWidth }}
      exit={isMobile ? { x: -320, opacity: 0 } : undefined}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={sidebarClass}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-glass-border/30">
        <motion.div
          animate={{ opacity: shouldCollapse ? 0 : 1 }}
          className="flex items-center gap-3 overflow-hidden flex-1"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          {!shouldCollapse && (
            <span className="font-semibold text-foreground whitespace-nowrap">
              {t("app.name")}
            </span>
          )}
        </motion.div>
        {shouldCollapse && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">B</span>
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="ml-2 p-2 rounded-lg hover:bg-white/5 text-muted-foreground"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const label =
            item.path === "/"
              ? t("nav.home")
              : item.path === "/getting-started"
              ? t("nav.gettingStarted")
              : item.path === "/architecture"
              ? t("nav.architecture")
              : item.path === "/design"
              ? t("nav.design")
              : item.path === "/apis"
              ? t("nav.apis")
              : item.path === "/projects"
              ? t("nav.projects")
              : item.label;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-gradient-to-r from-primary/20 to-accent/20 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0 relative z-10",
                  isActive && "text-primary"
                )}
              />
              <AnimatePresence>
                {!shouldCollapse && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap relative z-10"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge && !shouldCollapse && (
                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-primary to-accent text-white rounded-full relative z-10">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 space-y-1 border-t border-glass-border/30">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          const label = item.path === "/search" ? t("nav.search") : t("nav.settings");
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {!shouldCollapse && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}

        {/* Collapse Button */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 mx-auto" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">{t("nav.collapse")}</span>
              </>
            )}
          </button>
        )}
      </div>
    </motion.aside>
  );
}
