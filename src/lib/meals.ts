import type { DailyTasks } from "@/lib/types";

export type MealTaskKey = "meal_1_done" | "meal_snack_done" | "meal_2_done";

export const MEAL_TASK_KEYS: MealTaskKey[] = [
  "meal_1_done",
  "meal_snack_done",
  "meal_2_done",
];

export const MEAL_BLOCK_TO_TASK: Record<string, MealTaskKey> = {
  "meal-1": "meal_1_done",
  snack: "meal_snack_done",
  "meal-2": "meal_2_done",
};

export const EATING_WINDOW_CLOSE_HOUR = 20;

export function isEatingWindowClosed(now = new Date()): boolean {
  return now.getHours() >= EATING_WINDOW_CLOSE_HOUR;
}

export function allMealsComplete(tasks: DailyTasks): boolean {
  return MEAL_TASK_KEYS.every((key) => tasks[key]);
}

export function countCompletedMeals(tasks: DailyTasks): number {
  return MEAL_TASK_KEYS.filter((key) => tasks[key]).length;
}

/** Po zmene jedla synchronizuje 16:8 (fasting_window) podľa všetkých troch položiek. */
export function tasksWithMealUpdate(
  tasks: DailyTasks,
  mealKey: MealTaskKey,
  value: boolean
): DailyTasks {
  const next = { ...tasks, [mealKey]: value };
  return {
    ...next,
    fasting_window: allMealsComplete(next),
  };
}

export function rowToDailyTasks(
  row: Record<string, boolean | undefined>
): DailyTasks {
  return {
    fasting_window: Boolean(row.fasting_window),
    is_fasting_day: Boolean(row.is_fasting_day),
    hydration_1l: Boolean(row.hydration_1l),
    hydration_2l: Boolean(row.hydration_2l),
    hydration_3l: Boolean(row.hydration_3l),
    morning_vacuum: Boolean(row.morning_vacuum),
    evening_tech_off: Boolean(row.evening_tech_off),
    meal_1_done: Boolean(row.meal_1_done),
    meal_snack_done: Boolean(row.meal_snack_done),
    meal_2_done: Boolean(row.meal_2_done),
  };
}
