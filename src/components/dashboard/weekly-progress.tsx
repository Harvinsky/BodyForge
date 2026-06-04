"use client";

import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useEatingWindow } from "@/hooks/use-eating-window";
import { formatGoalDateLabel } from "@/lib/body-goal";
import { isHabitDone, type HabitKey } from "@/lib/habits";
import { useHydration } from "@/hooks/use-hydration";
import { formatDayCount } from "@/lib/i18n/plural";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

function WeekCell({ checked }: { checked: boolean }) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border sm:h-8 sm:w-8",
        checked
          ? "border-primary bg-primary/20 text-primary"
          : "border-primary/30 bg-background/50 text-transparent"
      )}
    >
      {checked && (
        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />
      )}
    </div>
  );
}

export function WeeklyProgress() {
  const { settings } = useBodyGoal();
  const { label } = useEatingWindow();
  const { dayColumns, tasks, toggleHabit, loading, logDate } = useDailyTracker();
  const { t, locale } = useI18n();

  const habitRows: { key: HabitKey; label: string }[] = [
    { key: "fasting", label },
    { key: "water", label: t("habits.water") },
    { key: "training", label: t("habits.training") },
  ];

  const { totalMl, goalMl } = useHydration();
  const dayCount = dayColumns.length;
  // For today's water habit, use actual logged volume so the checkbox reflects
  // real water even before the DB flag syncs back from use-hydration
  const todayHabits = (key: HabitKey) => {
    if (key === "water") return tasks.hydration_3l || totalMl >= goalMl;
    return isHabitDone(tasks, key);
  };
  const startLabel = formatGoalDateLabel(settings.programStartDate, locale);

  const habitWeekScore = (habit: HabitKey) => {
    if (dayCount === 0) return "0/0";
    const done = dayColumns.filter((d) => d.habits[habit]).length;
    return `${done}/${dayCount}`;
  };

  return (
    <Card className={cn("min-w-0", loading && "opacity-70")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          {t("weekly.title")}
          {loading && (
            <span className="text-[10px] font-normal text-muted-foreground">
              {t("common.sync").toLowerCase()}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 px-0 sm:px-6">
        {dayCount === 0 ? (
          <p className="px-4 text-sm text-muted-foreground sm:px-0">
            {settings.programStartDate
              ? t("weekly.emptyWithStart", { date: startLabel })
              : t("weekly.emptyNoStart")}
          </p>
        ) : (
          <div className="app-scroll-x w-full overflow-x-auto px-4 sm:px-0">
            <table className="w-full min-w-[320px] border-collapse text-xs sm:min-w-[360px] sm:text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[1] bg-card pb-3 pr-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:pr-4 sm:text-xs" />
                  {dayColumns.map((day) => (
                    <th
                      key={day.date}
                      className={cn(
                        "pb-3 px-0.5 text-center text-[10px] font-semibold uppercase tracking-wider sm:text-xs",
                        day.isToday ? "text-primary" : "text-[#e8d5a3]"
                      )}
                    >
                      {day.isToday ? t("common.today") : day.label.split(" ")[0]}
                      <span className="mt-0.5 block text-[9px] font-normal normal-case text-muted-foreground">
                        {day.label.split(" ").slice(1).join(" ")}
                      </span>
                    </th>
                  ))}
                  <th className="pb-3 pl-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                    {formatDayCount(dayCount, locale, t)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {habitRows.map((row) => (
                  <tr key={row.key} className="border-t border-primary/20">
                    <td className="sticky left-0 z-[1] bg-card py-2.5 pr-2 text-[11px] font-medium uppercase tracking-wide text-foreground sm:py-3 sm:pr-4 sm:text-sm">
                      {row.label}
                    </td>
                    {dayColumns.map((day) => (
                      <td
                        key={`${row.key}-${day.date}`}
                        className="py-1.5 text-center sm:py-2"
                      >
                        <div className="flex justify-center">
                          {day.isToday ? (
                            <Checkbox
                              checked={todayHabits(row.key)}
                              onCheckedChange={(v) =>
                                toggleHabit(row.key, v === true)
                              }
                              aria-label={t("weekly.ariaToday", {
                                habit: row.label,
                              })}
                              className="h-7 w-7 rounded-sm border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground sm:h-8 sm:w-8"
                            />
                          ) : (
                            <WeekCell checked={day.habits[row.key]} />
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="py-1.5 pl-1 text-center font-mono text-[10px] text-muted-foreground sm:py-2 sm:text-xs">
                      {habitWeekScore(row.key)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 px-4 text-xs text-muted-foreground sm:px-0">
          {dayCount === 0
            ? t("weekly.footerStartOnly", { date: startLabel })
            : t("weekly.footerWithDays", {
                count: Math.min(dayCount, 7),
                date: startLabel,
                today: logDate,
              })}
        </p>
      </CardContent>
    </Card>
  );
}
