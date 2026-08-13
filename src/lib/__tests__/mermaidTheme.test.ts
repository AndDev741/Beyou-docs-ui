import { describe, expect, it } from "vitest";

import { buildMermaidConfig, resolveMermaidTextColors } from "@/lib/mermaidTheme";

// The config is derived from two static brand palettes keyed by resolved base.
// These assertions pin the exact brand values so a palette drift (or a return
// to per-theme derivation) fails loudly.
describe("buildMermaidConfig", () => {
  it("derives light themeVariables from the light brand palette", () => {
    const config = buildMermaidConfig("light");

    expect(config.theme).toBe("base");
    expect(config.startOnLoad).toBe(false);

    const vars = config.themeVariables!;
    expect(vars.background).toBe("#F5F7FA");
    expect(vars.mainBkg).toBe("#F5F7FA");
    expect(vars.primaryColor).toBe("#1D6BF3");
    expect(vars.nodeBorder).toBe("#1558D6");
    expect(vars.secondBkg).toBe("#FFFFFF");
    expect(vars.clusterBorder).toBe("#E2E6EC");
    expect(vars.textColor).toBe("#171B22");
    expect(vars.primaryTextColor).toBe("#FFFFFF");
  });

  it("derives dark themeVariables from the dark brand palette", () => {
    const config = buildMermaidConfig("dark");

    const vars = config.themeVariables!;
    expect(vars.background).toBe("#0E1218");
    expect(vars.mainBkg).toBe("#0E1218");
    expect(vars.primaryColor).toBe("#5C9DFF");
    expect(vars.nodeBorder).toBe("#7AB0FF");
    expect(vars.secondBkg).toBe("#151A22");
    expect(vars.clusterBorder).toBe("#29313D");
    expect(vars.textColor).toBe("#F0F4F9");
    expect(vars.primaryTextColor).toBe("#0E1218");
  });

  it("uses the Geist font stack in both bases", () => {
    for (const base of ["light", "dark"] as const) {
      expect(buildMermaidConfig(base).themeVariables!.fontFamily).toBe(
        "Geist Variable, Geist, system-ui, sans-serif",
      );
    }
  });
});

describe("resolveMermaidTextColors", () => {
  it("feeds the --mermaid-* inline vars from the same palettes", () => {
    expect(resolveMermaidTextColors("light")).toEqual({
      textOnBackground: "#171B22",
      textOnPrimary: "#FFFFFF",
      edgeLabelBackground: "#E2E6EC",
    });
    expect(resolveMermaidTextColors("dark")).toEqual({
      textOnBackground: "#F0F4F9",
      textOnPrimary: "#0E1218",
      edgeLabelBackground: "#29313D",
    });
  });
});
