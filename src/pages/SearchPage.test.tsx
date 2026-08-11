import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SearchPage from "@/pages/SearchPage";
import { renderPage } from "@/test/renderWithProviders";

// Kept in step with SearchPage; a typo here would silently make the seeded
// entries invisible and the assertion below meaningless.
const RECENT_SEARCHES_KEY = "beyou-docs-recent-searches";

vi.mock("@/lib/searchApi", () => ({
  fetchSearchResults: vi.fn(),
}));

// Only useTranslation is stubbed, so assertions can match translation keys
// rather than copy. initReactI18next is exported because the module graph pulls
// in the real i18n setup.
//
// `t` and `i18n` are built once in the factory, not per call: SearchPage's
// debounce effect depends on a callback that closes over `i18n`, so handing back
// a fresh object each render changes that callback's identity, re-runs the
// effect, sets state, and renders again -- forever. The real react-i18next
// returns one stable instance, which is why this only bites in tests.
vi.mock("react-i18next", () => {
  const i18n = { language: "en", changeLanguage: vi.fn() };
  const t = (key: string) => key;

  return {
    useTranslation: () => ({ t, i18n }),
    initReactI18next: { type: "3rdParty", init: vi.fn() },
  };
});

describe("SearchPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the search title", () => {
    renderPage(<SearchPage />, { path: "/search" });

    expect(screen.getByText("search.title")).toBeInTheDocument();
    expect(screen.getByText("search.subtitle")).toBeInTheDocument();
  });

  // Recent searches come from localStorage. The test used to assert four
  // hardcoded translation keys (search.recent.1 ... .4) that an earlier
  // placeholder implementation rendered; nothing produces them now, so it was
  // asserting behaviour that no longer exists. Seeding storage exercises what
  // the page actually does.
  it("lists previously searched terms when the query is empty", () => {
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(["habit tracking", "spring security"]),
    );

    renderPage(<SearchPage />, { path: "/search" });

    expect(screen.getByText("search.recentTitle")).toBeInTheDocument();
    expect(screen.getByText("habit tracking")).toBeInTheDocument();
    expect(screen.getByText("spring security")).toBeInTheDocument();
  });

  it("shows the recent panel with no entries on a first visit", () => {
    renderPage(<SearchPage />, { path: "/search" });

    expect(screen.getByText("search.recentTitle")).toBeInTheDocument();
    expect(screen.queryByText("habit tracking")).not.toBeInTheDocument();
  });
});
