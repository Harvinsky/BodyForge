"use client";

import { useCallback, useEffect, useState } from "react";
import { APP_THEMES, isAppTheme, type AppTheme } from "@/lib/app-themes";

const THEME_KEY = "bodyforge-theme";

function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>("dark");

  useEffect(() => {
    const raw = localStorage.getItem(THEME_KEY);
    const stored = raw === "baby" ? "girls" : raw;
    const initial: AppTheme = isAppTheme(stored) ? stored : "dark";
    if (raw === "baby") localStorage.setItem(THEME_KEY, "girls");
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: AppTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggle, themes: APP_THEMES };
}

export type Theme = AppTheme;
export { APP_THEMES, type AppTheme } from "@/lib/app-themes";
