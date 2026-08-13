import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "beyou-docs-theme";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeBase = "light" | "dark";

/**
 * Migration table from the retired 9-theme model to light/dark/system.
 * Mirrored by the inline pre-paint script in index.html — the parity test in
 * ThemeContext.test.tsx executes that script body against this map and fails
 * if the two copies drift. Change both together.
 */
export const LEGACY_THEME_MAP: Record<string, ThemeMode> = {
  Midnight: "dark",
  Cyberpunk: "dark",
  Polar: "dark",
  "Late Latte": "dark",
  Sunset: "light",
  Amethyst: "light",
  Mocha: "light",
  beYou: "system",
  beYouDark: "system",
  light: "light",
  dark: "dark",
  system: "system",
};

/** Resolves a stored value (legacy name, current mode, garbage or null) to a mode. */
export function resolveThemeMode(stored: string | null): ThemeMode {
  if (stored !== null && Object.prototype.hasOwnProperty.call(LEGACY_THEME_MAP, stored)) {
    return LEGACY_THEME_MAP[stored];
  }
  return "system";
}

type ThemeContextType = {
  /** The persisted preference. */
  mode: ThemeMode;
  /** What is actually on screen: `system` resolved against the OS, live. */
  resolvedBase: ThemeBase;
  setMode: (next: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

function readStoredMode(): ThemeMode {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    /* storage blocked (private mode / sandboxed iframe) — treat as no preference */
  }
  return resolveThemeMode(stored);
}

const prefersDarkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);
  const [prefersDark, setPrefersDark] = useState(() => prefersDarkQuery().matches);

  // `system` follows the OS live: flipping the system theme with the app open
  // shows up without a reload.
  useEffect(() => {
    const query = prefersDarkQuery();
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  // Persistence doubles as the legacy migration write-back: the initial state
  // already ran the stored value through resolveThemeMode, so the first run of
  // this effect rewrites e.g. "Cyberpunk" as "dark".
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== mode) {
        window.localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch {
      /* storage blocked — the mode still applies in-session */
    }
  }, [mode]);

  // The provider's ONLY DOM effect. Explicit choices pin a class; `system`
  // carries no class so the prefers-color-scheme block in index.css resolves
  // it with zero JS (matching the pre-paint script in index.html).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (mode !== "system") root.classList.add(mode);
  }, [mode]);

  const resolvedBase: ThemeBase = mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  const value = useMemo<ThemeContextType>(
    () => ({ mode, resolvedBase, setMode }),
    [mode, resolvedBase],
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
