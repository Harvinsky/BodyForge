"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { APP_THEMES, useTheme, type AppTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const THEME_LABEL_KEYS: Record<AppTheme, MessageKey> = {
  dark: "appearance.themeDark",
  light: "appearance.themeLight",
  ocean: "appearance.themeOcean",
  ember: "appearance.themeEmber",
  slate: "appearance.themeSlate",
  girls: "appearance.themeGirls",
  forest: "appearance.themeForest",
  blossom: "appearance.themeBlossom",
};

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const pick = (id: AppTheme) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("appearance.themeLabel")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-8 w-8 shrink-0 border-primary/40 text-[#e8d5a3] hover:bg-accent",
          open && "border-primary/70 bg-primary/15"
        )}
      >
        <Palette className="h-3.5 w-3.5" strokeWidth={1.75} />
      </Button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("appearance.themeLabel")}
          className="absolute right-0 top-full z-50 mt-2 max-h-[min(16rem,70vh)] w-36 overflow-y-auto rounded-lg border border-primary/30 bg-card/95 py-1 shadow-xl backdrop-blur-md"
        >
          {APP_THEMES.map((id) => {
            const active = theme === id;
            return (
              <li key={id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => pick(id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-accent/80",
                    active && "bg-primary/10 text-[#e8d5a3]"
                  )}
                >
                  <span className="truncate">{t(THEME_LABEL_KEYS[id])}</span>
                  {active && (
                    <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
