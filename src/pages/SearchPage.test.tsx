import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SearchPage from "@/pages/SearchPage";
import { fetchSearchResults } from "@/lib/searchApi";

// Mock the search API
vi.mock("@/lib/searchApi", () => ({
  fetchSearchResults: vi.fn(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("SearchPage", () => {
  it("renders the search title", () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByText("search.title")).toBeInTheDocument();
    expect(screen.getByText("search.subtitle")).toBeInTheDocument();
  });

  it("shows recent searches when query is empty", () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByText("search.recentTitle")).toBeInTheDocument();
    // Should have recent search items (mocked translation keys)
    expect(screen.getByText("search.recent.1")).toBeInTheDocument();
    expect(screen.getByText("search.recent.2")).toBeInTheDocument();
    expect(screen.getByText("search.recent.3")).toBeInTheDocument();
    expect(screen.getByText("search.recent.4")).toBeInTheDocument();
  });

  // Additional tests could be added for search interactions, loading states, error handling, etc.
});