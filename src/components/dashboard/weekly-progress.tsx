"use client";

import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { HABIT_ROWS, isHabitDone, type HabitKey } from "@/lib/habits";

function WeekCell({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center border ${
        checked
          ? "border-primary bg-primary/20 text-primary"
          : "border-primary/30 bg-background/50 text-transparent"
      }`}
    >
      {checked && <Check className="h-4 w-4" strokeWidth={3} />}
    </div>
  );
}

export function WeeklyProgress() {
  const { weekColumns, tasks, toggleHabit, loading, logDate } = useDailyTracker();

  const todayHabits = (key: HabitKey) => isHabitDone(tasks, key);

  return (
    <Card className={loading ? "opacity-70" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2">
          Týždenný progress
          {loading && (
            <span className="text-[10px] font-normal text-muted-foreground">
              sync…
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" />
              {weekColumns.map((w) => (
                <th
                  key={w.label}
                  className="pb-3 text-center text-xs font-semibold uppercase tracking-wider text-[#e8d5a3]"
                >
                  {w.label}
                </th>
              ))}
              <th className="pb-3 pl-2 text-center text-xs font-semibold uppercase tracking-wider text-primary">
                Dnes
              </th>
            </tr>
          </thead>
          <tbody>
            {HABIT_ROWS.map((row) => (
              <tr key={row.key} className="border-t border-primary/20">
                <td className="py-3 pr-4 font-medium uppercase tracking-wide text-foreground">
                  {row.label}
                </td>
                {weekColumns.map((w) => (
                  <td key={`${row.key}-${w.label}`} className="py-2 text-center">
                    <div className="flex justify-center">
                      <WeekCell checked={w.habits[row.key]} />
                    </div>
                  </td>
                ))}
                <td className="py-2 pl-2 text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={todayHabits(row.key)}
                      onCheckedChange={(v) =>
                        toggleHabit(row.key, v === true)
                      }
                      aria-label={`${row.label} dnes`}
                      className="h-8 w-8 rounded-none border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Týždeň = splnené ≥5 dní · Dnes ({logDate}) upravíš priamo tu
        </p>
      </CardContent>
    </Card>
  );
}
