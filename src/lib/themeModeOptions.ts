import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import type { ThemeMode } from "@/context/ThemeContext";

/** Shared picker options — TopBar and Settings render the same three modes. */
export const THEME_MODE_OPTIONS: { mode: ThemeMode; icon: LucideIcon }[] = [
  { mode: "light", icon: Sun },
  { mode: "dark", icon: Moon },
  { mode: "system", icon: Monitor },
];
