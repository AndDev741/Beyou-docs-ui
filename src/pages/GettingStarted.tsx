import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";

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
        <div className="mt-6 glass-panel rounded-2xl p-6">
          <p className="text-sm text-muted-foreground">
            {t("common.comingSoon")}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
