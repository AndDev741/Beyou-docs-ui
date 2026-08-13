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
  /** Readable text on an `accent`-filled node. */
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

/** Colors the renderers feed into the `--mermaid-*` inline CSS variables. */
export const resolveMermaidTextColors = (base: ThemeBase) => {
  const palette = PALETTES[base];
  return {
    textOnBackground: palette.text,
    textOnPrimary: palette.textOnAccent,
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
      nodeTextColor: palette.textOnAccent,
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
