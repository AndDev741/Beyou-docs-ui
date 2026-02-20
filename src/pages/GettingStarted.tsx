import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Lightbulb } from "lucide-react";

export default function GettingStarted() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1 className="text-3xl font-bold text-foreground mb-3">
          {t("gettingStarted.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("gettingStarted.description")}
        </p>
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              {t("gettingStarted.whyBeyou.title")}
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            {t("gettingStarted.whyBeyou.paragraph")}
          </p>
        </div>
        <div className="mt-6 glass-panel rounded-2xl p-6">
          <p className="text-sm text-muted-foreground">
            {t("common.comingSoon")}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
