import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Settings from "@/pages/Settings";
import { renderPage } from "@/test/renderWithProviders";

const STORAGE_KEY = "beyou-docs-theme";

// Same stub as SearchPage.test.tsx: only useTranslation is replaced so
// assertions match translation keys rather than copy, and `t`/`i18n` are stable
// singletons so effects that close over them don't loop.
vi.mock("react-i18next", () => {
  const i18n = { language: "en", changeLanguage: vi.fn() };
  const t = (key: string) => key;

  return {
    useTranslation: () => ({ t, i18n }),
    initReactI18next: { type: "3rdParty", init: vi.fn() },
  };
});

describe("Settings theme picker", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("renders exactly light, dark and system as radios in a labelled radiogroup", () => {
    renderPage(<Settings />, { path: "/settings" });

    const group = screen.getByRole("radiogroup", { name: "settings.themeLabel" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(within(group).getByRole("radio", { name: "themes.light" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "themes.dark" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "themes.system" })).toBeInTheDocument();
  });

  it("clicking dark checks it, persists the mode, and pins the dark class", () => {
    renderPage(<Settings />, { path: "/settings" });

    const group = screen.getByRole("radiogroup", { name: "settings.themeLabel" });
    const dark = within(group).getByRole("radio", { name: "themes.dark" });
    expect(dark).toHaveAttribute("aria-checked", "false");

    fireEvent.click(dark);

    expect(dark).toHaveAttribute("aria-checked", "true");
    expect(
      within(group).getByRole("radio", { name: "themes.system" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
