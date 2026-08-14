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

  // The picker is deliberately NOT a radiogroup: plain buttons implement no
  // roving tabindex or arrow-key contract, so they advertise toggle-button
  // semantics (group + aria-pressed) instead of promising radio behavior.
  it("renders exactly light, dark and system as toggle buttons in a labelled group", () => {
    renderPage(<Settings />, { path: "/settings" });

    const group = screen.getByRole("group", { name: "settings.themeLabel" });
    expect(within(group).getAllByRole("button")).toHaveLength(3);
    expect(within(group).getByRole("button", { name: "themes.light" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "themes.dark" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "themes.system" })).toBeInTheDocument();
    expect(within(group).queryAllByRole("radio")).toHaveLength(0);
  });

  it("clicking dark presses it, persists the mode, and pins the dark class", () => {
    renderPage(<Settings />, { path: "/settings" });

    const group = screen.getByRole("group", { name: "settings.themeLabel" });
    const dark = within(group).getByRole("button", { name: "themes.dark" });
    expect(dark).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(dark);

    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(
      within(group).getByRole("button", { name: "themes.system" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
