import type { ReactElement } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ThemeProvider } from "@/context/ThemeContext";
import { DEFAULT_LOCALE, localizedPath } from "@/lib/i18nRouting";

/**
 * Renders a page the way the app actually mounts it.
 *
 * Pages are not standalone: MainLayout pulls in TopBar, which calls useTheme and
 * throws outside a ThemeProvider — that alone was breaking every page test.
 * They also read their locale from the `:lang` route segment and set metadata
 * through Helmet, so a bare <MemoryRouter> leaves them without a locale and
 * without a Helmet context.
 *
 * Mounting under `/:lang/*` rather than at a fixed path is what makes useLocale
 * resolve, and it means a test exercises the same routing shape as production.
 */
export function renderPage(
  ui: ReactElement,
  { path = "/", locale = DEFAULT_LOCALE } = {},
): RenderResult {
  return render(
    <HelmetProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={[localizedPath(locale, path)]}>
          <Routes>
            <Route path="/:lang/*" element={ui} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </HelmetProvider>,
  );
}
