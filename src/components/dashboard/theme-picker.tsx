"use client";

import { Palette } from "lucide-react";
import { useTheme, type AppTheme } from "@/hooks/use-theme";
import { useI18n } from "@/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/types";

const THEME_LABEL_KEYS: Record<AppTheme, MessageKey> = {
  dark: "appearance.themeDark",
  light: "appearance.themeLight",
  ocean: "appearance.themeOcean",
  ember: "appearance.themeEmber",
  slate: "appearance.themeSlate",
};

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <label className="relative flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-background/80 px-1.5">
      <Palette className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as AppTheme)}
        className="max-w-[5.5rem] cursor-pointer appearance-none bg-transparent pr-4 text-[10px] font-mono uppercase tracking-wide text-foreground outline-none sm:max-w-[6.5rem]"
        aria-label={t("appearance.themeLabel")}
      >
        {(["dark", "light", "ocean", "ember", "slate"] as const).map((id) => (
          <option key={id} value={id}>
            {t(THEME_LABEL_KEYS[id])}
          </option>
        ))}
      </select>
    </label>
  );
}
