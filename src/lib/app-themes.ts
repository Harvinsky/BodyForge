export const APP_THEMES = [
  "dark",
  "light",
  "ocean",
  "ember",
  "slate",
  "girls",
  "forest",
  "blossom",
] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export function isAppTheme(value: string | null): value is AppTheme {
  return value != null && (APP_THEMES as readonly string[]).includes(value);
}

/** Pre inline script v layout.tsx (bez importu modulov). */
export const APP_THEMES_SCRIPT_LIST = APP_THEMES.map((t) => `"${t}"`).join(",");
