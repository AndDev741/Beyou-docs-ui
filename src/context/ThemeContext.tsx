import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { defaultDark, defaultLight, themes, type ThemeType } from "@/components/utils/listOfThemes";

const STORAGE_KEY = "beyou-docs-theme";

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (next: ThemeType) => void;
  setThemeByMode: (mode: string) => void;
  availableThemes: ThemeType[];
};

const ThemeContext = createContext<ThemeContextType | null>(null);

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6 && cleaned.length !== 8) return null;
  const base = cleaned.length === 8 ? cleaned.slice(0, 6) : cleaned;
  const value = parseInt(base, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
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
}

function hexToHslString(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0% 0%";
  const { h, s, l } = rgbToHsl(rgb);
  return `${h} ${s}% ${l}%`;
}

function adjustLightness(hsl: string, delta: number) {
  const parts = hsl.split(" ");
  if (parts.length < 3) return hsl;
  const [h, s, lRaw] = parts;
  const lValue = parseFloat(lRaw.replace("%", ""));
  const nextL = Math.max(0, Math.min(100, lValue + delta));
  return `${h} ${s} ${nextL}%`;
}

function resolveInitialTheme(): ThemeType {
  if (typeof window === "undefined") return defaultLight;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const found = themes.find((theme) => theme.mode === stored);
    if (found) return found;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? defaultDark : defaultLight;
}

function applyTheme(theme: ThemeType) {
  const root = document.documentElement;
  const background = hexToHslString(theme.background);
  const foreground = hexToHslString(theme.secondary);
  const primary = hexToHslString(theme.primary);
  const description = hexToHslString(theme.description);
  const success = hexToHslString(theme.success);
  const error = hexToHslString(theme.error);

  const isDark = (() => {
    const rgb = hexToRgb(theme.background);
    if (!rgb) return false;
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  })();

  const baseDelta = isDark ? 6 : -4;
  const muted = adjustLightness(background, baseDelta * 1.5);
  const card = adjustLightness(background, baseDelta);
  const popover = adjustLightness(background, baseDelta * 1.2);
  const border = adjustLightness(background, isDark ? 14 : -12);
  const accent = adjustLightness(primary, isDark ? 4 : -6);
  const accentForeground = isDark ? "0 0% 100%" : "0 0% 0%";

  root.style.setProperty("--background", background);
  root.style.setProperty("--foreground", foreground);
  root.style.setProperty("--card", card);
  root.style.setProperty("--card-foreground", foreground);
  root.style.setProperty("--popover", popover);
  root.style.setProperty("--popover-foreground", foreground);
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", isDark ? "0 0% 100%" : "0 0% 100%");
  root.style.setProperty("--secondary", muted);
  root.style.setProperty("--secondary-foreground", foreground);
  root.style.setProperty("--muted", muted);
  root.style.setProperty("--muted-foreground", description);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-foreground", accentForeground);
  root.style.setProperty("--destructive", error);
  root.style.setProperty("--destructive-foreground", "0 0% 100%");
  root.style.setProperty("--border", border);
  root.style.setProperty("--input", border);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-background", adjustLightness(background, isDark ? 4 : -6));
  root.style.setProperty("--sidebar-foreground", foreground);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
  root.style.setProperty("--sidebar-accent", adjustLightness(background, isDark ? 8 : -8));
  root.style.setProperty("--sidebar-accent-foreground", foreground);
  root.style.setProperty("--sidebar-border", border);
  root.style.setProperty("--sidebar-ring", primary);
  root.style.setProperty("--glass", card);
  root.style.setProperty("--glass-border", border);
  root.style.setProperty("--glow-purple", primary);
  root.style.setProperty("--glow-pink", adjustLightness(primary, isDark ? 10 : -10));
  root.style.setProperty("--success", success);
  root.style.setProperty("--error", error);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme.mode);
    }
  }, [theme]);

  const setTheme = (next: ThemeType) => setThemeState(next);
  const setThemeByMode = (mode: string) => {
    const next = themes.find((item) => item.mode === mode);
    if (next) setThemeState(next);
  };

  const value = useMemo(
    () => ({ theme, setTheme, setThemeByMode, availableThemes: themes }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
