"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalorieLogEntry } from "@/lib/calories";
import { mealKeyShort } from "@/lib/i18n/calories-ui";
import { groupLogsByMeal } from "@/lib/meal-calorie-link";
import { useI18n } from "@/providers/locale-provider";

interface CalorieLogListProps {
  logs: CalorieLogEntry[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function CalorieLogList({
  logs,
  onRemove,
  disabled = false,
}: CalorieLogListProps) {
  const { t, dateLocale } = useI18n();
  const groups = groupLogsByMeal(logs).map((group) => ({
    ...group,
    label:
      group.mealKey != null
        ? mealKeyShort(group.mealKey, t)
        : t("calories.otherMeals"),
  }));

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {t("calories.todayByMeal")}
      </p>
      {groups.map((group) => (
        <div
          key={group.mealKey ?? "none"}
          className="border border-primary/20 bg-background/40"
        >
          <div className="flex items-center justify-between gap-2 border-b border-primary/15 px-2.5 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#e8d5a3]">
              {group.label}
            </span>
            <span className="font-mono text-xs text-primary">
              {group.total} kcal
            </span>
          </div>
          <ul className="divide-y divide-primary/10">
            {group.items.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5"
              >
                <div className="min-w-0 font-mono text-[11px]">
                  <span className="text-foreground/90">{log.label}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-primary">{log.calories}</span>
                  <span className="ml-0.5 text-[10px] text-muted-foreground">
                    kcal
                  </span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
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
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label={t("calories.removeEntry", { label: log.label })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
