import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Projects from "@/pages/Projects";
import { fetchOrgProjects } from "@/lib/githubProjects";
import { RoleProvider } from "@/context/RoleContext";

const mockRepo = {
  id: "gentekai/gentl-server",
  owner: "gentekai",
  repo: "gentl-server",
  label: "GentL Server",
  ref: "main",
};

vi.mock("@/data/projectRepos", () => ({
  resolveProjectRepos: () => [],
  resolveProjectOrg: () => "gentekai",
}));

vi.mock("@/lib/githubProjects", () => ({
  fetchOrgProjects: vi.fn().mockResolvedValue([
    {
      repo: mockRepo,
      info: {
        repo: mockRepo,
        name: "gentl-server",
        fullName: "gentekai/gentl-server",
        description: "GentL core server",
        htmlUrl: "https://github.com/gentekai/gentl-server",
        owner: { login: "gentekai" },
        language: "Java",
        defaultBranch: "main",
        visibility: "private",
        archived: false,
        disabled: false,
        private: true,
        fork: false,
        stars: 5,
        forks: 2,
        openIssues: 1,
        watchers: 3,
        commits: 120,
        branches: 6,
        tags: 14,
        updatedAt: "2026-01-15T10:00:00Z",
      },
    },
  ]),
}));

describe("Projects page", () => {
  it("renders repository cards from GitHub data", async () => {
    render(
      <RoleProvider>
        <MemoryRouter>
          <Projects />
        </MemoryRouter>
      </RoleProvider>,
    );

    expect(await screen.findByText("gentl-server")).toBeInTheDocument();
    expect(screen.getByText("gentekai/gentl-server")).toBeInTheDocument();
    expect(screen.getByText("120 commits")).toBeInTheDocument();
    expect(fetchOrgProjects).toHaveBeenCalled();
  });

  it("filters projects by search input", async () => {
    render(
      <RoleProvider>
        <MemoryRouter>
          <Projects />
        </MemoryRouter>
      </RoleProvider>,
    );

    await screen.findByText("gentl-server");
    fireEvent.change(screen.getByPlaceholderText("Search projects..."), {
      target: { value: "does-not-match" },
    });
    expect(screen.getByText("No projects found")).toBeInTheDocument();
  });
});
