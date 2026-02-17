import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import APIs from "@/pages/APIs";
import { fetchApiCatalog } from "@/lib/githubCatalog";
import { fetchOrgProjects } from "@/lib/githubProjects";
import { RoleProvider } from "@/context/RoleContext";

const mockCatalogs = vi.hoisted(() => [
  {
    repo: {
      id: "gentekai/gentl-ui-api",
      owner: "gentekai",
      repo: "gentl-ui-api",
      label: "GentL UI API",
      ref: "main",
    },
    specFile: "api/src/main/resources/gentl-ui.yaml",
    info: { title: "GentL UI API", version: "0.0.8" },
    paths: [
      {
        path: "/etlworkbenchs",
        sourcePath: "api/src/main/resources/paths/etlWorkbench.yaml",
      },
    ],
    schemas: [
      {
        name: "EtlWorkbench",
        sourcePath: "api/src/main/resources/schemas/EtlWorkbench.yaml",
      },
    ],
    warnings: [],
  },
]);

const mockProjectEntries = vi.hoisted(() => [
  {
    repo: mockCatalogs[0].repo,
    info: {
      repo: mockCatalogs[0].repo,
      name: "gentl-ui-api",
      fullName: "gentekai/gentl-ui-api",
      htmlUrl: "https://github.com/gentekai/gentl-ui-api",
      owner: { login: "gentekai" },
      defaultBranch: "main",
    },
  },
]);

vi.mock("@/lib/githubCatalog", () => ({
  fetchApiCatalog: vi.fn().mockResolvedValue(mockCatalogs[0]),
  fetchPathDetail: vi.fn().mockResolvedValue({
    path: "/etlworkbenchs",
    sourcePath: "api/src/main/resources/paths/etlWorkbench.yaml",
    operations: [
      {
        method: "GET",
        summary: "Returns all the current Workbenchs.",
        description: "Returns all the current Workbenchs.",
        operationId: "getAllObjects",
        tags: ["EtlWorkbench"],
        parameters: [],
        responses: [],
      },
    ],
  }),
  fetchSchemaDetail: vi.fn().mockResolvedValue({
    name: "EtlWorkbench",
    sourcePath: "api/src/main/resources/schemas/EtlWorkbench.yaml",
    description: "Workbench schema",
    type: "object",
    required: ["name"],
    properties: [
      {
        name: "name",
        type: "string",
        description: "Workbench name",
        required: true,
      },
    ],
    composedOf: [],
    raw: {},
  }),
  fetchSchemaDetailByPath: vi.fn().mockResolvedValue({
    name: "EtlWorkbench",
    sourcePath: "api/src/main/resources/schemas/EtlWorkbench.yaml",
    description: "Workbench schema",
    type: "object",
    required: ["name"],
    properties: [
      {
        name: "name",
        type: "string",
        description: "Workbench name",
        required: true,
      },
    ],
    composedOf: [],
    raw: {},
  }),
}));

vi.mock("@/lib/githubProjects", () => ({
  fetchOrgProjects: vi.fn().mockResolvedValue(mockProjectEntries),
}));

describe("APIs page", () => {
  it("renders API paths and schema counts", async () => {
    render(
      <RoleProvider>
        <MemoryRouter>
          <APIs />
        </MemoryRouter>
      </RoleProvider>,
    );

    expect(await screen.findByText("/etlworkbenchs")).toBeInTheDocument();
    expect(screen.getByText("1 APIs")).toBeInTheDocument();
    expect(screen.getByText("1 Schemas")).toBeInTheDocument();
    expect(fetchOrgProjects).toHaveBeenCalled();
    expect(fetchApiCatalog).toHaveBeenCalled();
  });

  it("switches to the schemas tab", async () => {
    render(
      <RoleProvider>
        <MemoryRouter>
          <APIs />
        </MemoryRouter>
      </RoleProvider>,
    );

    await screen.findByText("/etlworkbenchs");
    const schemasTab = screen.getByRole("tab", { name: "Schemas" });
    fireEvent.mouseDown(schemasTab);
    fireEvent.click(schemasTab);
    const matches = await screen.findAllByText("EtlWorkbench");
    expect(matches.length).toBeGreaterThan(0);
  });
});
