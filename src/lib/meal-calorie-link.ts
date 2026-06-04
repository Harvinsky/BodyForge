import { parseTimeToMinutes } from "@/lib/eating-window";
import type { MealBlock } from "@/lib/meal-plan-protocol";
import type { CalorieLogEntry } from "@/lib/calories";
import type { MealTaskKey } from "@/lib/meals";

export const MEAL_KEY_LABELS: Record<MealTaskKey, string> = {
  meal_1_done: "Jedlo 1",
  meal_snack_done: "Snack",
  meal_2_done: "Jedlo 2",
};

export const MEAL_KEY_SHORT: Record<MealTaskKey, string> = {
  meal_1_done: "Raňajky / jedlo 1",
  meal_snack_done: "Snack",
  meal_2_done: "Večera / jedlo 2",
};

export function inferMealKeyFromBlocks(
  blocks: MealBlock[],
  now = new Date()
): MealTaskKey {
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const slots = blocks
    .map((b) => ({
      key: b.taskKey,
      min: parseTimeToMinutes(b.time),
    }))
    .sort((a, b) => a.min - b.min);

  if (slots.length === 0) return "meal_1_done";

  let chosen = slots[0].key;
  for (const slot of slots) {
    if (nowMin >= slot.min - 30) {
      chosen = slot.key;
    }
  }
  return chosen;
}

export function groupLogsByMeal(logs: CalorieLogEntry[]): {
  mealKey: MealTaskKey | null;
  label: string;
  items: CalorieLogEntry[];
  total: number;
}[] {
  const groups = new Map<MealTaskKey | "none", CalorieLogEntry[]>();

  for (const log of logs) {
    const key = log.meal_key ?? "none";
    const list = groups.get(key) ?? [];
    list.push(log);
    groups.set(key, list);
  }

  const order: (MealTaskKey | "none")[] = [
    "meal_1_done",
    "meal_snack_done",
    "meal_2_done",
    "none",
  ];

  return order
    .filter((key) => groups.has(key))
    .map((key) => {
      const items = groups.get(key)!;
      const total = items.reduce((s, i) => s + i.calories, 0);
      const label =
        key === "none"
          ? "Ostatné"
          : MEAL_KEY_SHORT[key as MealTaskKey];
      return {
        mealKey: key === "none" ? null : (key as MealTaskKey),
        label,
        items,
        total,
      };
    });
}

export function mealHasLogs(
  logs: CalorieLogEntry[],
  mealKey: MealTaskKey
): boolean {
  return logs.some((l) => l.meal_key === mealKey);
}

export function sumMealCalories(
  logs: CalorieLogEntry[],
  mealKey: MealTaskKey
): number {
  return logs
    .filter((l) => l.meal_key === mealKey)
    .reduce((s, l) => s + l.calories, 0);
}
