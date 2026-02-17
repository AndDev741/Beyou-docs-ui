import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Architecture from "@/pages/Architecture";
import { fetchArchitectureTopicDetail, fetchArchitectureTopics } from "@/lib/architectureApi";
import { RoleProvider } from "@/context/RoleContext";

vi.mock("@/components/design/MermaidBlock", () => ({
  MermaidBlock: ({ code }: { code: string }) => <div>{code}</div>,
}));

vi.mock("@/lib/architectureApi", () => ({
  fetchArchitectureTopics: vi.fn().mockResolvedValue([
    {
      key: "core",
      title: "Core Architecture",
      summary: "System overview",
      orderIndex: 1,
      updatedAt: "2026-02-17",
    },
  ]),
  fetchArchitectureTopicDetail: vi.fn().mockResolvedValue({
    key: "core",
    title: "Core Architecture",
    diagramMermaid: "graph TD\nA-->B",
    docMarkdown: "# Notes\nContent",
    updatedAt: "2026-02-17",
  }),
}));

describe("Architecture page", () => {
  it("renders topics and details from the docs API", async () => {
    render(
      <RoleProvider>
        <MemoryRouter>
          <Architecture />
        </MemoryRouter>
      </RoleProvider>,
    );

    expect(await screen.findByText("Core Architecture")).toBeInTheDocument();
    expect(await screen.findByText("Notes")).toBeInTheDocument();
    expect(fetchArchitectureTopics).toHaveBeenCalled();
    expect(fetchArchitectureTopicDetail).toHaveBeenCalled();
  });
});
