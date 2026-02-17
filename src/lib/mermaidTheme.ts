import type { ThemeType } from "@/components/utils/listOfThemes";
import { defaultDark, lateNight, sunsetTheme } from "@/components/utils/listOfThemes";

type Hsl = { h: number; s: number; l: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6 && cleaned.length !== 8) return null;
  const base = cleaned.length === 8 ? cleaned.slice(0, 6) : cleaned;
  const value = parseInt(base, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }): Hsl => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / delta) % 6;
        break;
      case gNorm:
        h = (bNorm - rNorm) / delta + 2;
        break;
      default:
        h = (rNorm - gNorm) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const toHslCss = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "hsl(0 0% 0%)";
  const { h, s, l } = rgbToHsl(rgb);
  return `hsl(${h} ${s}% ${l}%)`;
};

const adjustLightness = (hex: string, delta: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "hsl(0 0% 0%)";
  const { h, s, l } = rgbToHsl(rgb);
  const nextL = clamp(l + delta, 0, 100);
  return `hsl(${h} ${s}% ${nextL}%)`;
};

const isDarkTheme = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
};

const pickTextColor = (hex: string) => (isDarkTheme(hex) ? "#ffffff" : "#0b0b0b");

const resolveTextColor = (theme: ThemeType) => {
  const mode = theme.mode.toLowerCase();
  const sunsetTone = sunsetTheme.secondary;
  const darkTone = defaultDark.secondary || lateNight.secondary;

  if (["beyou", "amethyst", "mocha"].includes(mode)) {
    return sunsetTone;
  }

  if (["midnight", "cyberpunk", "polar"].includes(mode)) {
    return darkTone;
  }

  return pickTextColor(theme.background);
};

export const resolveMermaidTextColors = (theme: ThemeType) => {
  const isDark = isDarkTheme(theme.background);
  return {
    textOnBackground: resolveTextColor(theme),
    textOnPrimary: pickTextColor(theme.primary),
    edgeLabelBackground: adjustLightness(theme.background, isDark ? 12 : -10),
  };
};

export const buildMermaidConfig = (theme: ThemeType) => {
  const isDark = isDarkTheme(theme.background);
  const background = toHslCss(theme.background);
  const primary = toHslCss(theme.primary);
  const { textOnBackground, textOnPrimary, edgeLabelBackground } = resolveMermaidTextColors(theme);
  const muted = adjustLightness(theme.background, isDark ? 8 : -6);
  const mutedStrong = adjustLightness(theme.background, isDark ? 14 : -10);
  const border = adjustLightness(theme.background, isDark ? 18 : -16);
  const accent = adjustLightness(theme.primary, isDark ? 10 : -10);

  return {
    startOnLoad: false,
    theme: "base",
    themeVariables: {
      primaryColor: primary,
      primaryTextColor: textOnPrimary,
      primaryBorderColor: primary,
      lineColor: accent,
      edgeLabelColor: textOnBackground,
      secondaryColor: muted,
      tertiaryColor: mutedStrong,
      background,
      mainBkg: background,
      secondBkg: muted,
      nodeBorder: primary,
      clusterBkg: muted,
      clusterBorder: border,
      titleColor: textOnBackground,
      edgeLabelBackground: edgeLabelBackground,
      labelTextColor: textOnBackground,
      nodeTextColor: textOnPrimary,
      textColor: textOnBackground,
      secondaryTextColor: textOnBackground,
      noteTextColor: textOnBackground,
      actorTextColor: textOnBackground,
      fontFamily: "Source Serif 4, Iowan Old Style, Times New Roman, serif",
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
