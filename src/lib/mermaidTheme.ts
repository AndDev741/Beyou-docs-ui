import mermaid from "mermaid";
import type { MermaidConfig } from "mermaid";
import type { ThemeBase } from "@/context/ThemeContext";

/**
 * Static brand palettes, one per resolved base. Diagram colors come straight
 * from here — nothing is derived from the retired 9-theme model any more, and
 * these hex values mirror the CSS custom properties in index.css.
 */
type MermaidPalette = {
  bg: string;
  surface: string;
  text: string;
  text2: string;
  border: string;
  accent: string;
  accentStrong: string;
  /**
   * Readable text on an `accent`-filled shape (mermaid `primaryTextColor`).
   * Node fills use `bg` via `mainBkg`, so node label text takes `text`, NOT
   * this value — on-accent over a bg fill is invisible in dark mode.
   */
  textOnAccent: string;
};

const PALETTES: Record<ThemeBase, MermaidPalette> = {
  light: {
    bg: "#F5F7FA",
    surface: "#FFFFFF",
    text: "#171B22",
    text2: "#566070",
    border: "#E2E6EC",
    accent: "#1D6BF3",
    accentStrong: "#1558D6",
    textOnAccent: "#FFFFFF",
  },
  dark: {
    bg: "#0E1218",
    surface: "#151A22",
    text: "#F0F4F9",
    text2: "#A3AEBD",
    border: "#29313D",
    accent: "#5C9DFF",
    accentStrong: "#7AB0FF",
    textOnAccent: "#0E1218",
  },
};

/**
 * Colors the renderers feed into the `--mermaid-*` inline CSS variables.
 * `nodeText` backs `--mermaid-node-text`, which index.css applies to
 * `.node text` with `!important` — nodes are bg-filled (`mainBkg`), so this
 * must be the main text color, never the on-accent color.
 */
export const resolveMermaidTextColors = (base: ThemeBase) => {
  const palette = PALETTES[base];
  return {
    textOnBackground: palette.text,
    nodeText: palette.text,
    edgeLabelBackground: palette.border,
  };
};

export const buildMermaidConfig = (base: ThemeBase): MermaidConfig => {
  const palette = PALETTES[base];

  return {
    startOnLoad: false,
    theme: "base",
    themeVariables: {
      primaryColor: palette.accent,
      primaryTextColor: palette.textOnAccent,
      primaryBorderColor: palette.accentStrong,
      lineColor: palette.accentStrong,
      edgeLabelColor: palette.text,
      secondaryColor: palette.surface,
      tertiaryColor: palette.border,
      background: palette.bg,
      mainBkg: palette.bg,
      secondBkg: palette.surface,
      nodeBorder: palette.accentStrong,
      clusterBkg: palette.surface,
      clusterBorder: palette.border,
      titleColor: palette.text,
      edgeLabelBackground: palette.border,
      labelTextColor: palette.text,
      nodeTextColor: palette.text,
      textColor: palette.text,
      secondaryTextColor: palette.text2,
      noteTextColor: palette.text,
      actorTextColor: palette.text,
      fontFamily: "Geist Variable, Geist, system-ui, sans-serif",
    },
    flowchart: {
      curve: "basis",
      padding: 20,
    },
    sequence: {
      actorMargin: 50,
      boxMargin: 10,
      boxTextMargin: 5,
    },
  };
};

/**
 * `mermaid.initialize` is global, so it needs exactly one owner: components
 * used to call it per instance (10 diagrams = 10 identical inits, again on
 * every theme flip). Renderers call this instead; it re-initializes only when
 * `base` differs from the last-initialized value. Rendering itself still
 * happens per component.
 */
let initializedBase: ThemeBase | null = null;

export function ensureMermaid(base: ThemeBase): void {
  if (initializedBase === base) return;
  mermaid.initialize(buildMermaidConfig(base));
  initializedBase = base;
}

/** Test hook: forget the last-initialized base so a test can force a re-init. */
export function resetMermaidInitForTests(): void {
  initializedBase = null;
}
