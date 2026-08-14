import { motion } from "framer-motion";
import { Palette, Settings as SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Seo } from "@/components/seo/Seo";
import { useStaticSeo } from "@/hooks/useStaticSeo";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { THEME_MODE_OPTIONS } from "@/lib/themeModeOptions";
import { useLocale, useLocaleFreePath } from "@/hooks/useLocale";
import { localizedPath, rememberLocale, type SupportedLocale } from "@/lib/i18nRouting";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { t } = useTranslation();

  const seo = useStaticSeo("settings");

  return (
    <MainLayout>
      <Seo {...seo} />
      <div className="p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("settings.description")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Palette className="w-4 h-4" />
            <span className="text-sm font-medium">{t("settings.appearance")}</span>
          </div>

          <AppearanceSettings />
        </motion.div>
      </div>
    </MainLayout>
  );
}

function AppearanceSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = useLocale();
  const currentPath = useLocaleFreePath();

  // Same reasoning as the TopBar switcher: the locale is part of the URL, so
  // changing language means navigating, and it lands on the page you were
  // already reading rather than sending you home.
  const switchLanguage = (next: SupportedLocale) => {
    if (next === locale) return;
    rememberLocale(next);
    navigate(localizedPath(next, currentPath));
  };
  const { mode, setMode } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-panel rounded-xl p-6 space-y-6"
    >
      <div>
        <label className="text-sm font-medium text-foreground mb-4 block">
          {t("settings.themeLabel")}
        </label>
        {/* Honest toggle-button semantics: a real radiogroup promises roving
            tabindex + arrow-key movement, which these plain buttons don't
            implement. aria-pressed on tab-reachable buttons matches what the
            keyboard actually does. */}
        <div role="group" aria-label={t("settings.themeLabel")} className="flex gap-3">
          {THEME_MODE_OPTIONS.map((option) => {
            const isActive = option.mode === mode;
            const Icon = option.icon;
            return (
              <button
                key={option.mode}
                type="button"
                aria-pressed={isActive}
                onClick={() => setMode(option.mode)}
                className={cn(
                  "px-4 py-2 rounded-lg border transition-all",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-glass-border/30 hover:border-glass-border",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">
                    {t(`themes.${option.mode}`)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-4 block">
          {t("settings.languageLabel")}
        </label>
        <div className="flex gap-3">
          {[
            { id: "en", label: "English" },
            { id: "pt", label: "Portugues" },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => switchLanguage(lang.id as SupportedLocale)}
              className={cn(
                "px-4 py-2 rounded-lg border transition-all",
                locale === lang.id
                  ? "border-primary bg-primary/10"
                  : "border-glass-border/30 hover:border-glass-border",
              )}
            >
              <span className="text-sm font-medium text-foreground">{lang.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
