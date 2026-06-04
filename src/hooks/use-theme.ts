"use client";

import { useCallback, useEffect, useState } from "react";

/** dark = predvolený BodyForge (zlatá), light = svetlý režim */
export const APP_THEMES = [
  "dark",
  "light",
  "ocean",
  "ember",
  "slate",
] as const;

export type AppTheme = (typeof APP_THEMES)[number];

const THEME_KEY = "bodyforge-theme";

function isAppTheme(value: string | null): value is AppTheme {
  return value != null && (APP_THEMES as readonly string[]).includes(value);
}

function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const initial: AppTheme = isAppTheme(stored) ? stored : "dark";
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
