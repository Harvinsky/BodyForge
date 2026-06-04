import type { DailyTasks } from "@/lib/types";

export type HabitKey = "fasting" | "water" | "training";

export const HABIT_ROWS: { key: HabitKey; label: string }[] = [
  { key: "fasting", label: "16:8" },
  { key: "water", label: "VODA (3,5 L)" },
  { key: "training", label: "TRÉNING" },
];

export function isHabitDone(tasks: DailyTasks, habit: HabitKey): boolean {
  switch (habit) {
    case "fasting":
      return tasks.fasting_window;
    case "water":
      return tasks.hydration_3l;
    case "training":
      return tasks.training_done;
  }
}

export function waterWeekPercent(days: DailyTasks[]): number {
  if (days.length === 0) return 0;
  const done = days.filter((d) => d.hydration_3l).length;
  return Math.round((done / days.length) * 100);
}

export function weekHabitSuccess(
  days: DailyTasks[],
  habit: HabitKey,
  threshold = 5
): boolean {
  const done = days.filter((d) => isHabitDone(d, habit)).length;
  return done >= threshold;
}
