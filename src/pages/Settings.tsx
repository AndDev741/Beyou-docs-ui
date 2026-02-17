import { motion } from "framer-motion";
import { Palette, Settings as SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

export default function Settings() {
  const { t } = useTranslation();

  return (
    <MainLayout>
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
  const { t, i18n } = useTranslation();
  const { theme, setThemeByMode, availableThemes } = useTheme();
  const themeLabel = (mode: string) => t(`themes.${mode}`, { defaultValue: mode });

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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableThemes.map((themeOption) => {
            const isActive = themeOption.mode === theme.mode;
            return (
              <button
                key={themeOption.mode}
                onClick={() => setThemeByMode(themeOption.mode)}
                className={cn(
                  "px-4 py-3 rounded-lg border transition-all text-left",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-glass-border/30 hover:border-glass-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ background: themeOption.primary }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {themeLabel(themeOption.mode)}
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
              onClick={() => i18n.changeLanguage(lang.id)}
              className={cn(
                "px-4 py-2 rounded-lg border transition-all",
                i18n.language === lang.id
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
