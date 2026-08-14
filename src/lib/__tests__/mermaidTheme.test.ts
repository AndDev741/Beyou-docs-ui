import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildMermaidConfig, resolveMermaidTextColors } from "@/lib/mermaidTheme";
import type { ThemeBase } from "@/context/ThemeContext";

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
    // Nodes are bg-filled (mainBkg), so node text is the main text color;
    // on-accent is reserved for primaryTextColor (accent-filled shapes).
    expect(vars.nodeTextColor).toBe("#171B22");
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
    // Regression guard: node text on a bg-filled node must be the light text
    // color, not the dark on-accent value (which equals the node fill and
    // rendered labels invisible).
    expect(vars.nodeTextColor).toBe("#F0F4F9");
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
    // nodeText backs --mermaid-node-text, which index.css forces onto
    // `.node text` — it must be the main text color in both bases.
    expect(resolveMermaidTextColors("light")).toEqual({
      textOnBackground: "#171B22",
      nodeText: "#171B22",
      edgeLabelBackground: "#E2E6EC",
    });
    expect(resolveMermaidTextColors("dark")).toEqual({
      textOnBackground: "#F0F4F9",
      nodeText: "#F0F4F9",
      edgeLabelBackground: "#29313D",
    });
  });
});

/* ------------------------------------------------------------------ */
/* Palette drift guard: the hardcoded hex palettes in mermaidTheme.ts  */
/* claim to mirror the HSL tokens in src/index.css. Convert each hex   */
/* back to an "H S% L%" triplet and compare against the CSS source, so */
/* a brand retune in index.css fails here instead of silently leaving  */
/* diagrams on the old colors.                                         */
/* ------------------------------------------------------------------ */

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

/** Slice out the body of the first `selector {` block (no nested braces). */
function extractBlock(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector not found in index.css: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

function parseCssVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

/** #RRGGBB -> "H S% L%" with the same integer rounding the CSS tokens use. */
function hexToHslTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta + 6) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Which themeVariable carries each palette slot, and which CSS token it
 * mirrors. textOnAccent is deliberately absent: in dark it is the bg hex (a
 * design choice for readable text on the light-blue accent), not a mirror of
 * --primary-foreground.
 */
const TOKEN_MIRROR: ReadonlyArray<readonly [configKey: string, cssVar: string]> = [
  ["background", "--background"], // palette bg
  ["secondBkg", "--card"], // palette surface
  ["textColor", "--foreground"], // palette text
  ["secondaryTextColor", "--muted-foreground"], // palette text2
  ["clusterBorder", "--border"], // palette border
  ["primaryColor", "--primary"], // palette accent
  ["nodeBorder", "--accent"], // palette accentStrong
];

describe("mermaid palettes mirror index.css tokens", () => {
  it.each<[ThemeBase, string]>([
    ["light", ":root"],
    ["dark", ".dark"],
  ])("%s palette hexes match the %s block HSL triplets", (base, selector) => {
    const cssVars = parseCssVars(extractBlock(selector));
    const themeVars = buildMermaidConfig(base).themeVariables! as Record<string, string>;

    for (const [configKey, cssVar] of TOKEN_MIRROR) {
      expect(cssVars[cssVar], `${cssVar} missing from ${selector}`).toBeDefined();
      expect(
        hexToHslTriplet(themeVars[configKey]),
        `${configKey} (${themeVars[configKey]}) should mirror ${cssVar} in ${selector}`,
      ).toBe(cssVars[cssVar]);
    }
  });
});
