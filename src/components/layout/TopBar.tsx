import { motion } from "framer-motion";
import { Command, Globe, Menu, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { THEME_MODE_OPTIONS } from "@/lib/themeModeOptions";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect } from "react";
import { useLocale, useLocaleFreePath, useLocalizedPath } from "@/hooks/useLocale";
import { localizedPath, rememberLocale, type SupportedLocale } from "@/lib/i18nRouting";

interface TopBarProps {
  onOpenSidebar?: () => void;
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  const { mode, setMode } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = useLocale();
  const currentPath = useLocaleFreePath();
  const localized = useLocalizedPath();

  // Switching language is a navigation, not a state change: the locale lives in
  // the URL, so changing it any other way would leave the address bar claiming
  // one language while the page renders another. Landing on the SAME page in
  // the other language (rather than the home page) is also what the hreflang
  // tags promise a search engine.
  const switchLanguage = useCallback(
    (next: SupportedLocale) => {
      if (next === locale) return;
      rememberLocale(next);
      navigate(localizedPath(next, currentPath));
    },
    [currentPath, locale, navigate],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        navigate(localized("/search"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [localized, navigate]);

  const themeLabel = (value: ThemeMode) => t(`themes.${value}`);
  const languageOptions = [
    { id: "en", label: "English", short: "EN" },
    { id: "pt", label: "Português", short: "PT" },
  ];
  const resolvedLanguage = locale;
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
                  onClick={() => switchLanguage(lang.id as SupportedLocale)}
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
                <span className="text-xs text-muted-foreground">{themeLabel(mode)}</span>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-glass-border">
              <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(value) => setMode(value as ThemeMode)}
                aria-label={t("topbar.theme")}
              >
                {THEME_MODE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuRadioItem
                      key={option.mode}
                      value={option.mode}
                      className="cursor-pointer flex items-center gap-3"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm font-medium">{themeLabel(option.mode)}</span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
