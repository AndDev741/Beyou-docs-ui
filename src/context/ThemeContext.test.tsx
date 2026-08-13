import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LEGACY_THEME_MAP,
  resolveThemeMode,
  ThemeProvider,
  useTheme,
  type ThemeMode,
} from "@/context/ThemeContext";

const STORAGE_KEY = "beyou-docs-theme";

/* ------------------------------------------------------------------ */
/* matchMedia: setup.ts installs a static matches:false stub; media    */
/* change scenarios need a mock whose listeners can actually fire.     */
/* ------------------------------------------------------------------ */

type MediaListener = (event: { matches: boolean; media: string }) => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<MediaListener>();
  const mql = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: (cb: MediaListener) => listeners.add(cb),
    removeListener: (cb: MediaListener) => listeners.delete(cb),
    addEventListener: (_type: string, cb: MediaListener) => listeners.add(cb),
    removeEventListener: (_type: string, cb: MediaListener) => listeners.delete(cb),
    dispatchEvent: () => true,
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    dispatchChange(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((cb) => cb({ matches, media: mql.media }));
    },
  };
}

/* ------------------------------------------------------------------ */
/* Provider harness                                                    */
/* ------------------------------------------------------------------ */

let captured: ReturnType<typeof useTheme> | null = null;

function Capture() {
  captured = useTheme();
  return null;
}

const mountProvider = () =>
  render(
    <ThemeProvider>
      <Capture />
    </ThemeProvider>,
  );

const rootClasses = () => ({
  light: document.documentElement.classList.contains("light"),
  dark: document.documentElement.classList.contains("dark"),
});

/* ------------------------------------------------------------------ */
/* Inline pre-paint script harness                                     */
/* ------------------------------------------------------------------ */

function extractInlineScript(): string {
  // vitest runs with the project root as cwd (vitest.config.ts lives there).
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  // The module bundle tag carries attributes (`<script type="module" ...>`),
  // so a bare `<script>` open tag matches only the inline pre-paint script.
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("pre-paint <script> not found in index.html");
  return match[1];
}

interface ScriptRun {
  classes: Set<string>;
  written: string | null;
  error: unknown;
}

function runPrePaintScript(
  stored: string | null,
  opts: { storageBlocked?: boolean } = {},
): ScriptRun {
  const classes = new Set<string>();
  let written: string | null = null;

  const win: Record<string, unknown> = {};
  if (opts.storageBlocked) {
    Object.defineProperty(win, "localStorage", {
      get() {
        throw new Error("storage blocked");
      },
    });
  } else {
    win.localStorage = {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        written = value;
      },
    };
  }

  const doc = {
    documentElement: {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
      },
    },
  };

  let error: unknown = null;
  try {
    new Function("window", "document", extractInlineScript())(win, doc);
  } catch (caught) {
    error = caught;
  }
  return { classes, written, error };
}

/* ------------------------------------------------------------------ */

describe("ThemeContext", () => {
  beforeEach(() => {
    captured = null;
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    installMatchMedia(false);
  });

  afterEach(() => {
    document.documentElement.classList.remove("light", "dark");
    localStorage.clear();
  });

  describe("legacy migration on mount", () => {
    it("stored 'Cyberpunk' resolves dark and storage becomes 'dark'", () => {
      localStorage.setItem(STORAGE_KEY, "Cyberpunk");
      mountProvider();
      expect(captured!.mode).toBe("dark");
      expect(captured!.resolvedBase).toBe("dark");
      expect(rootClasses()).toEqual({ light: false, dark: true });
      expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    });

    it.each<[string, ThemeMode]>([
      ["Sunset", "light"],
      ["Amethyst", "light"],
      ["Mocha", "light"],
      ["Midnight", "dark"],
      ["Polar", "dark"],
      ["Late Latte", "dark"],
      ["beYou", "system"],
      ["beYouDark", "system"],
      ["light", "light"],
      ["dark", "dark"],
      ["system", "system"],
      ["totally-bogus", "system"],
      ["hasOwnProperty", "system"],
    ])("stored %j migrates to %j and is written back", (stored, expected) => {
      localStorage.setItem(STORAGE_KEY, stored);
      mountProvider();
      expect(captured!.mode).toBe(expected);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(expected);
    });
  });

  it("explicit light with OS dark keeps the light class and resolvedBase light", () => {
    installMatchMedia(true); // OS prefers dark
    localStorage.setItem(STORAGE_KEY, "light");
    mountProvider();
    expect(rootClasses()).toEqual({ light: true, dark: false });
    expect(captured!.resolvedBase).toBe("light");
  });

  it("system mode follows matchMedia change events live", () => {
    const media = installMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "system");
    mountProvider();
    expect(captured!.resolvedBase).toBe("light");
    // System carries no class: the prefers-color-scheme block in index.css
    // resolves the vars, so the documentElement must stay class-free.
    expect(rootClasses()).toEqual({ light: false, dark: false });

    act(() => media.dispatchChange(true));
    expect(captured!.resolvedBase).toBe("dark");
    expect(rootClasses()).toEqual({ light: false, dark: false });

    act(() => media.dispatchChange(false));
    expect(captured!.resolvedBase).toBe("light");
  });

  it("setMode updates documentElement classes and persists", () => {
    mountProvider(); // nothing stored -> system
    expect(captured!.mode).toBe("system");

    act(() => captured!.setMode("dark"));
    expect(captured!.mode).toBe("dark");
    expect(captured!.resolvedBase).toBe("dark");
    expect(rootClasses()).toEqual({ light: false, dark: true });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");

    act(() => captured!.setMode("light"));
    expect(rootClasses()).toEqual({ light: true, dark: false });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");

    act(() => captured!.setMode("system"));
    expect(rootClasses()).toEqual({ light: false, dark: false });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("system");
  });

  describe("inline pre-paint script parity", () => {
    it("matches resolveThemeMode for every legacy, migrated and unknown value", () => {
      const inputs = [...Object.keys(LEGACY_THEME_MAP), "totally-bogus"];
      for (const input of inputs) {
        const expected = resolveThemeMode(input);
        const run = runPrePaintScript(input);
        expect(run.error, `script threw for ${JSON.stringify(input)}`).toBeNull();
        expect(run.written, `write-back for ${JSON.stringify(input)}`).toBe(expected);
        expect(run.classes.has("light"), `light class for ${JSON.stringify(input)}`).toBe(
          expected === "light",
        );
        expect(run.classes.has("dark"), `dark class for ${JSON.stringify(input)}`).toBe(
          expected === "dark",
        );
      }
    });

    it("with blocked storage falls through to system: no class, no write, no throw", () => {
      const run = runPrePaintScript("dark", { storageBlocked: true });
      expect(run.error).toBeNull();
      expect(run.classes.size).toBe(0);
      expect(run.written).toBeNull();
    });
  });

  it("provider with blocked storage mounts in system mode without throwing", () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage blocked");
      },
    });
    try {
      expect(() => mountProvider()).not.toThrow();
      expect(captured!.mode).toBe("system");
      expect(rootClasses()).toEqual({ light: false, dark: false });
    } finally {
      if (descriptor) {
        Object.defineProperty(window, "localStorage", descriptor);
      }
    }
  });
});
