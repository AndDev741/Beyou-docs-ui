import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Settings from "@/pages/Settings";
import { RoleProvider } from "@/context/RoleContext";

describe("Settings page", () => {
  it("renders AI key configuration fields", () => {
    render(
      <RoleProvider>
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      </RoleProvider>,
    );

    expect(screen.getByText("AI Keys")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("DeepSeek")).toBeInTheDocument();
    expect(screen.getAllByLabelText("API Key")).toHaveLength(2);
    expect(screen.getAllByLabelText("Default Model")).toHaveLength(2);
  });
});
