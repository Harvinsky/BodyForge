"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HydrationLogEntry } from "@/lib/hydration";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

interface HydrationLogListProps {
  logs: HydrationLogEntry[];
  onRemove: (id: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function HydrationLogList({
  logs,
  onRemove,
  disabled = false,
  compact = false,
}: HydrationLogListProps) {
  const { t, dateLocale } = useI18n();
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
  );

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {t("hydration.logTitle")}
      </p>
      <ul className={cn("space-y-1.5", compact && "max-h-36 overflow-y-auto")}>
        {sorted.map((log) => (
          <li
            key={log.id}
            className="flex items-center justify-between gap-2 border border-[#38bdf8]/20 bg-background/50 px-3 py-2"
          >
            <div className="min-w-0 font-mono text-xs">
              <span className="text-[#7dd3fc]">
                +{log.amount_ml >= 1000 ? `${log.amount_ml / 1000}L` : `${log.amount_ml}ml`}
              </span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {format(new Date(log.logged_at), "HH:mm", {
                  locale: dateLocale,
                })}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => onRemove(log.id)}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              aria-label={t("hydration.removeDose", { ml: log.amount_ml })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
