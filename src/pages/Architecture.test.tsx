import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import Architecture from "@/pages/Architecture";
import { fetchArchitectureTopics } from "@/lib/githubArchitecture";
import { fetchOrgProjects } from "@/lib/githubProjects";
import { RoleProvider } from "@/context/RoleContext";

vi.mock("reactflow", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  addEdge: (_connection: unknown, edges: unknown[]) => edges,
  applyEdgeChanges: (_changes: unknown[], edges: unknown[]) => edges,
  applyNodeChanges: (_changes: unknown[], nodes: unknown[]) => nodes,
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
  },
}));

vi.mock("@/data/architectureRepo", () => ({
  resolveArchitectureRepo: () => ({
    id: "gentekai/gentl-architecture-ui",
    owner: "gentekai",
    repo: "gentl-architecture-ui",
    label: "Architecture",
  }),
}));

vi.mock("@/lib/githubArchitecture", () => ({
  fetchArchitectureTopics: vi.fn().mockResolvedValue([
    {
      slug: "core",
      title: "Core Architecture",
      description: "System overview",
      tags: ["core"],
      linkedProjects: ["gentekai/gentl-server"],
      updatedAt: "2026-01-20T00:00:00Z",
      sourcePath: "topics/core/index.yml",
    },
  ]),
  fetchTopicAssets: vi.fn().mockResolvedValue({
    diagrams: [
      { name: "overview", path: "topics/core/diagrams/overview.mmd", type: "diagram" },
    ],
    docs: [
      { name: "readme", path: "topics/core/docs/readme.md", type: "doc" },
    ],
  }),
  fetchTopicFile: vi.fn().mockResolvedValue("graph TD\nA-->B"),
  saveArchitectureFile: vi.fn().mockResolvedValue(undefined),
  deleteArchitectureFile: vi.fn().mockResolvedValue(undefined),
  buildTopicIndexYaml: vi.fn().mockReturnValue("title: Core"),
}));

vi.mock("@/lib/githubProjects", () => ({
  fetchOrgProjects: vi.fn().mockResolvedValue([
    {
      repo: { id: "gentekai/gentl-server", owner: "gentekai", repo: "gentl-server" },
      info: {
        repo: { id: "gentekai/gentl-server", owner: "gentekai", repo: "gentl-server" },
        name: "gentl-server",
        fullName: "gentekai/gentl-server",
        description: "GentL core server",
        htmlUrl: "https://github.com/gentekai/gentl-server",
        owner: { login: "gentekai" },
        updatedAt: "2026-01-20T00:00:00Z",
      },
    },
  ]),
}));

describe("Architecture page", () => {
  it("renders topics from GitHub and shows diagrams list", async () => {
    render(
      <RoleProvider>
        <MemoryRouter>
          <Architecture />
        </MemoryRouter>
      </RoleProvider>,
    );

    expect(await screen.findByText("Core Architecture")).toBeInTheDocument();
    expect(await screen.findByText("overview")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Full screen" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(fetchArchitectureTopics).toHaveBeenCalled();
    expect(fetchOrgProjects).toHaveBeenCalled();
  });
});
