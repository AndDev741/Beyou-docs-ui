import { motion } from "framer-motion";
import { Command, Globe, Menu, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";

interface TopBarProps {
  onOpenSidebar?: () => void;
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  const { theme, setThemeByMode, availableThemes } = useTheme();
  const { t, i18n } = useTranslation();
  const themeLabel = (mode: string) => t(`themes.${mode}`, { defaultValue: mode });
  const languageOptions = [
    { id: "en", label: "English", short: "EN" },
    { id: "pt", label: "Português", short: "PT" },
  ];
  const resolvedLanguage = i18n.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
  const activeLanguage = languageOptions.find((lang) => lang.id === resolvedLanguage) ?? languageOptions[0];

  return (
    <header className="h-16 border-b border-glass-border/30 glass-panel sticky top-0 z-30">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground"
            aria-label={t("nav.collapse")}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="md:hidden text-sm font-semibold text-foreground">{t("app.name")}</span>
        </div>

        {/* Center - Command Palette Hint */}
        <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground">
          <Command className="w-4 h-4" />
          <span className="text-sm">{t("topbar.searchPlaceholder")}</span>
          <kbd className="ml-2 px-2 py-0.5 text-xs bg-white/10 rounded">⌘K</kbd>
        </button>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">{t("topbar.language")}</span>
                <span className="text-xs text-muted-foreground">{activeLanguage.short}</span>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-popover border-glass-border">
              {languageOptions.map((lang) => (
                <DropdownMenuItem
                  key={lang.id}
                  onClick={() => i18n.changeLanguage(lang.id)}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full border border-white/20"
                    style={{
                      background:
                        lang.id === resolvedLanguage
                          ? "hsl(var(--primary))"
                          : "transparent",
                    }}
                  />
                  <span className="text-sm font-medium">{lang.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                <Palette className="w-4 h-4" />
                <span className="text-sm font-medium">{t("topbar.theme")}</span>
                <span className="text-xs text-muted-foreground">{themeLabel(theme.mode)}</span>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover border-glass-border">
              {availableThemes.map((themeOption) => (
                <DropdownMenuItem
                  key={themeOption.mode}
                  onClick={() => setThemeByMode(themeOption.mode)}
                  className="cursor-pointer flex items-center gap-3"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ background: themeOption.primary }}
                  />
                  <span className="text-sm font-medium">{themeLabel(themeOption.mode)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
