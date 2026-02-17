import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { DesignList } from "@/components/design/DesignList";
import { DesignViewer } from "@/components/design/DesignViewer";
import { EmptyDesignState } from "@/components/design/EmptyDesignState";
import { useDesigns } from "@/hooks/useDesigns";
import { resolveArchitectureRepo } from "@/data/architectureRepo";

const envArchRepo = import.meta.env.VITE_ARCH_REPO as string | undefined;

export default function Design() {
  const { t } = useTranslation();
  const repoConfig = useMemo(() => resolveArchitectureRepo(envArchRepo), [envArchRepo]);
  const { designs, selectedDesign, setSelectedDesign, loading, error } = useDesigns(repoConfig);

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:h-[calc(100vh-64px)]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-80 border-b md:border-b-0 md:border-r border-glass-border/30 glass-panel flex flex-col max-h-[45vh] md:max-h-none"
        >
          <DesignList
            designs={designs}
            selectedDesign={selectedDesign}
            onSelect={setSelectedDesign}
            loading={loading}
            error={error}
          />
        </motion.aside>

        <div className="flex-1 overflow-auto">
          {selectedDesign ? (
            <DesignViewer design={selectedDesign} />
          ) : (
            <EmptyDesignState title={t("design.empty.title")} description={t("design.empty.description")} />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
