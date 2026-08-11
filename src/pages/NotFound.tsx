import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/seo/Seo";
import { useLocalizedPath } from "@/hooks/useLocale";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const localized = useLocalizedPath();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      {/* noindex matters more here than on any other page: nginx serves the SPA
          shell for unknown paths, so without it a crawler would happily index
          every typo'd URL as a thin duplicate of this one. */}
      <Seo title={t("notFound.title")} description={t("notFound.message")} noIndex />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFound.message")}</p>
        {/* A plain <a href="/"> dropped the locale and forced a full reload. */}
        <Link to={localized("/")} className="text-primary underline hover:text-primary/90">
          {t("notFound.cta")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
